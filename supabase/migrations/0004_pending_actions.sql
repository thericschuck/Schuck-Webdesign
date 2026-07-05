-- ============================================================
-- 0004 – pending_actions (Human-in-the-Loop Zwischenspeicher)
-- ============================================================
-- Speichert bestätigungspflichtige Tool-Aufrufe von JARVIS, bis Eric sie über
-- /api/jarvis/confirm bestätigt oder ablehnt. "conversation" enthält die
-- komplette Message-History inkl. des assistant-Turns mit dem tool_use-Block,
-- damit der Agent-Loop nach der Entscheidung nahtlos fortgesetzt werden kann.

create table if not exists public.pending_actions (
  id           uuid primary key default gen_random_uuid(),
  tool_name    text not null,
  tool_args    jsonb not null,
  conversation jsonb not null,
  expires_at   timestamptz not null default (now() + interval '30 minutes'),
  created_at   timestamptz not null default now()
);

alter table public.pending_actions enable row level security;

create policy "pending_actions: Admin verwaltet alle"
  on public.pending_actions for all
  using (public.get_my_role() = 'admin');

create index if not exists pending_actions_expires_at_idx on public.pending_actions(expires_at);
