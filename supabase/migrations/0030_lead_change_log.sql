-- ============================================================
-- 0030 – Lead-Änderungshistorie (Audit-Trail für den Sheet-Sync)
-- ============================================================
-- syncAkquiseFromSheet() überschreibt Lead-Felder bisher stillschweigend mit dem
-- Sheet-Stand — ohne Historie, was sich wann geändert hat. Diese Tabelle protokolliert
-- pro geändertem Feld eine Zeile (nicht pro Sync-Lauf), damit sie sich direkt als
-- Zeitleiste auf der Lead-Detailseite rendern lässt.

create table if not exists public.lead_change_log (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  field       text not null,
  old_value   text,
  new_value   text,
  changed_at  timestamptz not null default now()
);

alter table public.lead_change_log enable row level security;

create policy "lead_change_log: Admin verwaltet alle"
  on public.lead_change_log for all
  using (public.get_my_role() = 'admin');

create index if not exists lead_change_log_lead_id_idx on public.lead_change_log(lead_id);
