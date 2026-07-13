-- ============================================================
-- 0018 – agent_runs.significance + Realtime für agent_runs/agent_steps
-- Baut auf 0017_jarvis_phase1_agents.sql auf. Defensiv geschrieben: sicher
-- erneut ausführbar, keine Breaking Changes an bestehenden Spalten.
-- ============================================================

-- 1. agent_runs.significance — steuert, wie "auffällig" ein Run z.B. im UI
--    markiert wird (trivial/normal/notable). NOT NULL mit Default füllt
--    bestehende Zeilen beim ersten Lauf automatisch, kein separater Backfill nötig.
alter table public.agent_runs
  add column if not exists significance text not null default 'normal';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'agent_runs_significance_check'
  ) then
    alter table public.agent_runs
      add constraint agent_runs_significance_check
      check (significance in ('trivial','normal','notable'));
  end if;
end $$;

-- ============================================================
-- 2. Supabase Realtime für agent_runs + agent_steps aktivieren.
--    Existenzprüfung nötig, da `alter publication ... add table` fehlschlägt,
--    wenn die Tabelle schon Mitglied ist (kein "if not exists" in der Syntax).
--    supabase_realtime existierte hier schon (bisher nur `public.messages`).
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'agent_runs'
  ) then
    alter publication supabase_realtime add table public.agent_runs;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'agent_steps'
  ) then
    alter publication supabase_realtime add table public.agent_steps;
  end if;
end $$;

-- ============================================================
-- 3. RLS-Check für Realtime (keine Schemaänderung, nur Dokumentation der
--    Verifikation):
--
--    Realtime respektiert dieselben RLS-Policies wie PostgREST — ein
--    eingeloggter Client empfängt nur Change-Events für Zeilen, die eine
--    SELECT-Policy für seine Rolle erlaubt. Zwei Voraussetzungen dafür:
--
--    a) Eine RLS-Policy, die SELECT für den Admin erlaubt.
--       → Bereits erfüllt: 0017 legt "agent_runs: Admin verwaltet alle" /
--         "agent_steps: Admin verwaltet alle" als `FOR ALL` an (siehe
--         schema.sql-Konvention `using (public.get_my_role() = 'admin')`).
--         `FOR ALL` deckt SELECT/INSERT/UPDATE/DELETE ab, also auch den für
--         Realtime relevanten Lesezugriff — keine zusätzliche Policy nötig.
--
--    b) Ein Basis-GRANT auf der Tabelle für die Rolle `authenticated`
--       (RLS schränkt Zeilen ein, ersetzt aber nicht das Tabellen-Grant).
--       → Verifiziert per information_schema.role_table_grants: `authenticated`
--         hat auf agent_runs/agent_steps bereits SELECT (und weitere Rechte),
--         identisch zum bereits per Realtime funktionierenden `public.messages`
--         (Supabase vergibt das automatisch für neue public-Tabellen über
--         ALTER DEFAULT PRIVILEGES). Auch hier ist nichts zu ergänzen.
--
--    Fazit: Die bestehende "Admin verwaltet alle"-Policy aus 0017 reicht für
--    Realtime-Subscriptions vollständig aus.
-- ============================================================
