-- ============================================================
-- 0015 – JARVIS: persistente Konversationshistorie
-- ============================================================
-- Bisher lebte die JARVIS-Konversation nur im React-State der Seite und war
-- nach jedem Reload weg (inkl. teurem Cold-Start-Neuaufbau). Gespeichert werden
-- bewusst nur die finalen, sichtbaren Text-Turns (user/assistant) — keine rohen
-- Tool-Use/Tool-Result-Blöcke, die beim Replay an die API ohnehin nur Tokens
-- kosten würden, ohne für künftige Turns relevant zu sein.

create table if not exists public.jarvis_messages (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);

alter table public.jarvis_messages enable row level security;
create index if not exists jarvis_messages_profile_id_idx on public.jarvis_messages(profile_id, created_at);

create policy "jarvis_messages: Admin verwaltet alle"
  on public.jarvis_messages for all
  using (public.get_my_role() = 'admin');
