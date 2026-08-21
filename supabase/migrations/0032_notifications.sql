-- Benachrichtigungseinstellungen (Push + E-Mail) pro User, plus Push-Abos und
-- ein Reminder-Tracking-Feld auf todos, damit der Cron-Job fällige To-Dos nur
-- einmal meldet statt bei jedem Lauf erneut.

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  push_enabled boolean not null default false,
  email_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "Nutzer verwalten eigene Benachrichtigungseinstellungen"
  on public.notification_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Nutzer verwalten eigene Push-Abos"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.todos
  add column reminder_sent_at timestamptz;
