-- ============================================================
-- 0017 – JARVIS Phase 1: Multi-Agent-Grundgerüst
-- Orchestrator, Executor, Care-Agent (+ 5 vorbereitete Sub-Agenten)
-- Defensiv geschrieben: sicher ausführbar auch wenn Teile schon existieren.
-- ============================================================

-- 1. AGENTEN-DEFINITIONEN
create table if not exists public.agents (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  role            text,
  system_prompt   text not null,
  -- Aktuell empfohlenes Modell als Default statt eines veralteten Sonnet-Standes —
  -- jeder Agent kann das pro Zeile trotzdem überschreiben.
  model           text not null default 'claude-opus-4-8',
  parent_agent_id uuid references public.agents(id),
  config          jsonb default '{}',
  status          text not null default 'active' check (status in ('active','inactive')),
  position        jsonb,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 2. TOOLS + Zuordnung
create table if not exists public.tools (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  description     text,
  input_schema    jsonb not null,
  is_irreversible boolean default false,
  timeout_ms      integer default 30000
);

create table if not exists public.agent_tools (
  agent_id uuid references public.agents(id) on delete cascade,
  tool_id  uuid references public.tools(id) on delete cascade,
  primary key (agent_id, tool_id)
);

-- 3. AGENT-RUNS
create table if not exists public.agent_runs (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null default gen_random_uuid(),
  agent_id      uuid references public.agents(id),
  parent_run_id uuid references public.agent_runs(id),
  trigger       text,
  task          text,
  status        text not null default 'queued'
                check (status in ('queued','running','waiting_human','succeeded','failed','cancelled')),
  retry_count   int default 0,
  result        jsonb,
  error         jsonb,
  started_at    timestamptz,
  ended_at      timestamptz,
  created_at    timestamptz default now()
);

-- 4. AGENT-STEPS
create table if not exists public.agent_steps (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid references public.agent_runs(id) on delete cascade,
  parent_step_id uuid references public.agent_steps(id),
  seq            int not null,
  type           text not null check (type in ('reasoning','llm','tool_call','tool_result','handoff','error')),
  agent_id       uuid references public.agents(id),
  tool_slug      text,
  input          jsonb,
  output         jsonb,
  status         text default 'running' check (status in ('running','done','error')),
  duration_ms    int,
  tokens_used    int,
  retry_count    int default 0,
  created_at     timestamptz default now()
);

-- 5. AGENT-MESSAGES
create table if not exists public.agent_messages (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid references public.agent_runs(id) on delete cascade,
  from_agent_id uuid references public.agents(id),
  to_agent_id   uuid references public.agents(id),
  role          text,
  content       jsonb,
  created_at    timestamptz default now()
);

-- 6. PENDING_ACTIONS erweitern (Tabelle existiert bereits seit 0004_pending_actions.sql)
--    Defensiv: nur ergänzen, was noch fehlt.
alter table public.pending_actions add column if not exists run_id       uuid references public.agent_runs(id);
alter table public.pending_actions add column if not exists step_id     uuid references public.agent_steps(id);
alter table public.pending_actions add column if not exists action_type text;
alter table public.pending_actions add column if not exists payload     jsonb;
alter table public.pending_actions add column if not exists status      text default 'pending';
alter table public.pending_actions add column if not exists decided_by  text;
alter table public.pending_actions add column if not exists decided_at  timestamptz;
alter table public.pending_actions add column if not exists expires_at  timestamptz;

-- Check-Constraint für status separat, da "add constraint if not exists" nicht existiert
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pending_actions_status_check'
  ) then
    alter table public.pending_actions
      add constraint pending_actions_status_check
      check (status in ('pending','approved','rejected','expired'));
  end if;
end $$;

-- 7. DELIVERABLES
create table if not exists public.deliverables (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid references public.agent_runs(id),
  client_id    uuid references public.clients(id),
  project_id   uuid references public.projects(id),
  type         text not null,
  title        text not null,
  storage_path text not null,
  mime_type    text,
  status       text not null default 'draft' check (status in ('draft','sent','archived')),
  sent_at      timestamptz,
  created_at   timestamptz default now()
);

-- 8. SCHEDULED_TASKS
create table if not exists public.scheduled_tasks (
  id            uuid primary key default gen_random_uuid(),
  agent_id      uuid references public.agents(id),
  cron_expr     text not null,
  task_template text not null,
  scope         text default 'per_client',
  active        boolean default true,
  last_run_at   timestamptz
);

-- ============================================================
-- Storage Bucket für Deliverables (privat)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('deliverables', 'deliverables', false)
on conflict (id) do nothing;

-- ============================================================
-- Row Level Security — ausschließlich Admin (Eric), kein Public-/Client-Zugriff.
-- Nutzt dieselbe public.get_my_role() = 'admin'-Konvention wie der Rest des Projekts
-- (siehe schema.sql, z.B. "jarvis_messages: Admin verwaltet alle") statt einer
-- pauschalen "authenticated"-Freigabe, die auch Kundenportal-Logins einschließen würde.
-- ============================================================
alter table public.agents enable row level security;
alter table public.tools enable row level security;
alter table public.agent_tools enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_steps enable row level security;
alter table public.agent_messages enable row level security;
alter table public.deliverables enable row level security;
alter table public.scheduled_tasks enable row level security;
-- pending_actions hat schon RLS + eine "Admin verwaltet alle"-Policy aus 0004 —
-- die neuen Spalten sind Teil derselben Zeilen, brauchen also keine eigene Policy.

do $$
declare
  t text;
begin
  foreach t in array array['agents','tools','agent_tools','agent_runs','agent_steps',
                            'agent_messages','deliverables','scheduled_tasks']
  loop
    execute format(
      'drop policy if exists "%s: Admin verwaltet alle" on public.%I;
       create policy "%s: Admin verwaltet alle" on public.%I
       for all using (public.get_my_role() = ''admin'');',
      t, t, t, t
    );
  end loop;
end $$;

-- Storage: nur Admin liest/schreibt/löscht im 'deliverables'-Bucket.
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'storage: Admin verwaltet Deliverables') then
    create policy "storage: Admin verwaltet Deliverables"
      on storage.objects for all
      using (bucket_id = 'deliverables' and public.get_my_role() = 'admin')
      with check (bucket_id = 'deliverables' and public.get_my_role() = 'admin');
  end if;
end $$;

-- ============================================================
-- Seed: Agenten-Grundgerüst
-- ============================================================
insert into public.agents (slug, name, role, system_prompt, status) values
  ('orchestrator',    'Orchestrator',    'orchestrator', 'PLATZHALTER: System-Prompt folgt', 'active'),
  ('executor',        'Executor',        'executor',     'PLATZHALTER: System-Prompt folgt', 'active'),
  ('care-agent',      'Care-Agent',      'care',         'PLATZHALTER: System-Prompt folgt', 'active'),
  ('design-agent',    'Design-Agent',    'design',       'PLATZHALTER: System-Prompt folgt', 'inactive'),
  ('code-agent',      'Code-Agent',      'code',         'PLATZHALTER: System-Prompt folgt', 'inactive'),
  ('seo-agent',       'SEO-Agent',       'seo',          'PLATZHALTER: System-Prompt folgt', 'inactive'),
  ('akquise-agent',   'Akquise-Agent',   'akquise',      'PLATZHALTER: System-Prompt folgt', 'inactive'),
  ('finanzen-agent',  'Finanzen-Agent',  'finanzen',     'PLATZHALTER: System-Prompt folgt', 'inactive')
on conflict (slug) do nothing;
