-- HELM: echte Multi-Conversation-Sessions statt eines einzigen durchgehenden Verlaufs pro
-- Profil. helm_messages bekommt eine conversation_id; bestehende Nachrichten werden in eine
-- einzelne "Alter Verlauf"-Konversation pro Profil migriert, damit keine Historie verloren geht.

create table public.helm_conversations (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  title       text,
  pinned      boolean not null default false,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index helm_conversations_profile_idx on public.helm_conversations (profile_id, pinned desc, updated_at desc);

alter table public.helm_conversations enable row level security;

create policy "helm_conversations: Admin verwaltet alle"
  on public.helm_conversations for all
  using (public.get_my_role() = 'admin');

alter table public.helm_messages add column conversation_id uuid references public.helm_conversations(id) on delete cascade;

-- Backfill: pro Profil mit bestehenden Nachrichten eine Konversation anlegen und alle seine
-- helm_messages daran hängen.
do $$
declare
  profile_row record;
  new_conversation_id uuid;
begin
  for profile_row in select distinct profile_id from public.helm_messages where conversation_id is null loop
    insert into public.helm_conversations (profile_id, title)
    values (profile_row.profile_id, 'Alter Verlauf')
    returning id into new_conversation_id;

    update public.helm_messages
    set conversation_id = new_conversation_id
    where profile_id = profile_row.profile_id and conversation_id is null;
  end loop;
end $$;

alter table public.helm_messages alter column conversation_id set not null;

create index helm_messages_conversation_idx on public.helm_messages (conversation_id, created_at);
