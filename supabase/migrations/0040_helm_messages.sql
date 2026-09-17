-- HELM (JARVIS-Nachfolger): jarvis_messages speicherte nur den finalen sichtbaren Text
-- (role/content) — reine Scrollback-Anzeige, kein System of Record, keine Business-Daten.
-- Da HELM auf @ai-sdk/react (useChat) umgestellt wird, muss die gespeicherte Form ohnehin
-- ein vollständiges UIMessage (inkl. Tool-Call-/Pending-Action-Parts) sein, damit ein Reload
-- verlustfrei denselben Rendering-Pfad durchläuft — ein reiner Rename hätte hier nicht
-- gereicht. Bestehende jarvis_messages-Zeilen (Erics bisheriger JARVIS-Chatverlauf) gehen
-- dabei sichtbar, aber folgenlos verloren — das ist kein Datenverlust im GoBD-/Business-Sinn,
-- nur eine einmalige Scrollback-Lücke beim Umstieg auf HELM.
drop table if exists public.jarvis_messages;

create table public.helm_messages (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  message     jsonb not null,
  created_at  timestamptz not null default now()
);

alter table public.helm_messages enable row level security;
create index helm_messages_profile_id_idx on public.helm_messages(profile_id, created_at);

create policy "helm_messages: Admin verwaltet alle"
  on public.helm_messages for all
  using (public.get_my_role() = 'admin');
