-- HELM Automationen: zeitgesteuerte Agenten-Läufe. Bewusst kein Cron-String, sondern ein
-- einfaches Wiederholungs-Modell (täglich / wöchentlich an Wochentag X, jeweils zu einer
-- Uhrzeit) — passt zum Anwendungsfall ("Care-Agent jeden Montag 8 Uhr") ohne
-- Cron-Parser-Dependency. next_run_at wird in TypeScript berechnet (lib/helm/automations.ts),
-- nicht per SQL-Trigger. Zeiten werden gegen Europe/Berlin interpretiert, DST wird in v1
-- bewusst NICHT speziell behandelt (Formular weist darauf hin).

create table public.helm_automations (
  id             uuid primary key default gen_random_uuid(),
  label          text not null,
  agent_slug     text not null,
  task           text not null,
  recurrence     text not null check (recurrence in ('daily', 'weekly')),
  weekday        smallint check (weekday between 0 and 6),
  time_of_day    time not null,
  status         text not null default 'active' check (status in ('active', 'paused')),
  last_run_at    timestamptz,
  next_run_at    timestamptz not null,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint weekday_requires_weekly check (recurrence = 'weekly' or weekday is null)
);

create index helm_automations_due_idx on public.helm_automations (next_run_at) where status = 'active';

alter table public.helm_automations enable row level security;

create policy "helm_automations: Admin verwaltet alle"
  on public.helm_automations for all
  using (public.get_my_role() = 'admin');

-- Verknüpft automatisierte Läufe mit ihrer Automation, damit Cockpit/RunHistoryTable sie
-- zuordnen können, ohne die Observability-Tabelle zu verdoppeln.
alter table public.agent_runs add column automation_id uuid references public.helm_automations(id) on delete set null;

create index agent_runs_automation_idx on public.agent_runs (automation_id, started_at desc) where automation_id is not null;
