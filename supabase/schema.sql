-- ============================================================
-- Schuck Webdesign – Supabase Schema
-- Ausführen im Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================


-- ============================================================
-- 0. ENUMS
-- ============================================================

create type public.user_role as enum ('admin', 'client');

create type public.client_status as enum ('active', 'inactive');

create type public.project_status as enum (
  'briefing',
  'design',
  'development',
  'review',
  'live'
);

create type public.document_category as enum (
  'contract',
  'invoice',
  'briefing',
  'handover',
  'other'
);


-- ============================================================
-- 1. TABLES
-- ============================================================

-- profiles (1:1 mit auth.users)
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text not null,
  role        public.user_role not null default 'client',
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- clients
create table public.clients (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  company_name text not null,
  website      text,
  phone        text,
  status       public.client_status not null default 'active',
  created_at   timestamptz not null default now()
);

-- projects
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  title       text not null,
  description text,
  status      public.project_status not null default 'briefing',
  start_date  date,
  launch_date date,
  created_at  timestamptz not null default now()
);

-- documents
create table public.documents (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects (id) on delete set null,
  client_id   uuid not null references public.clients (id) on delete cascade,
  name        text not null,
  file_url    text not null,
  category    public.document_category not null default 'other',
  uploaded_by uuid not null references public.profiles (id),
  created_at  timestamptz not null default now()
);

-- project_updates
create table public.project_updates (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  message    text not null,
  created_at timestamptz not null default now()
);


-- ============================================================
-- 2. INDEXES
-- ============================================================

create index on public.clients (profile_id);
create index on public.projects (client_id);
create index on public.documents (client_id);
create index on public.documents (project_id);
create index on public.project_updates (project_id);


-- ============================================================
-- 3. TRIGGER – profile bei Registrierung automatisch anlegen
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- 4. HELPER FUNCTION – eigene Rolle abfragen (für RLS)
-- ============================================================

create or replace function public.get_my_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles       enable row level security;
alter table public.clients        enable row level security;
alter table public.projects       enable row level security;
alter table public.documents      enable row level security;
alter table public.project_updates enable row level security;


-- ── profiles ────────────────────────────────────────────────

-- Jeder sieht sein eigenes Profil; Admin sieht alle
create policy "profiles: eigenes Profil lesen"
  on public.profiles for select
  using (id = auth.uid() or public.get_my_role() = 'admin');

-- Jeder darf sein eigenes Profil bearbeiten
create policy "profiles: eigenes Profil bearbeiten"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admin darf Rollen vergeben
create policy "profiles: Admin verwaltet alle"
  on public.profiles for all
  using (public.get_my_role() = 'admin');


-- ── clients ─────────────────────────────────────────────────

-- Client sieht nur seinen eigenen clients-Eintrag
create policy "clients: eigenen Eintrag lesen"
  on public.clients for select
  using (
    profile_id = auth.uid()
    or public.get_my_role() = 'admin'
  );

-- Nur Admin darf clients anlegen / bearbeiten / löschen
create policy "clients: Admin verwaltet alle"
  on public.clients for all
  using (public.get_my_role() = 'admin');


-- ── projects ────────────────────────────────────────────────

-- Client sieht nur Projekte, die seinem clients-Eintrag gehören
create policy "projects: Client sieht eigene Projekte"
  on public.projects for select
  using (
    exists (
      select 1 from public.clients c
      where c.id = projects.client_id
        and c.profile_id = auth.uid()
    )
    or public.get_my_role() = 'admin'
  );

-- Nur Admin darf Projekte anlegen / bearbeiten / löschen
create policy "projects: Admin verwaltet alle"
  on public.projects for all
  using (public.get_my_role() = 'admin');


-- ── documents ───────────────────────────────────────────────

-- Client sieht nur Dokumente seines clients-Eintrags
create policy "documents: Client sieht eigene Dokumente"
  on public.documents for select
  using (
    exists (
      select 1 from public.clients c
      where c.id = documents.client_id
        and c.profile_id = auth.uid()
    )
    or public.get_my_role() = 'admin'
  );

-- Nur Admin darf Dokumente anlegen / bearbeiten / löschen
create policy "documents: Admin verwaltet alle"
  on public.documents for all
  using (public.get_my_role() = 'admin');


-- ── project_updates ─────────────────────────────────────────

-- Client sieht nur Updates seiner Projekte
create policy "project_updates: Client sieht eigene Updates"
  on public.project_updates for select
  using (
    exists (
      select 1
      from public.projects p
      join public.clients c on c.id = p.client_id
      where p.id = project_updates.project_id
        and c.profile_id = auth.uid()
    )
    or public.get_my_role() = 'admin'
  );

-- Nur Admin darf Updates schreiben
create policy "project_updates: Admin verwaltet alle"
  on public.project_updates for all
  using (public.get_my_role() = 'admin');


-- ============================================================
-- 6. STORAGE – Bucket 'documents'
-- ============================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false);

-- Client darf nur Dateien aus seinem eigenen Ordner (client_id/) lesen
create policy "storage: Client liest eigene Dokumente"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (
      -- Pfadstruktur: documents/<client_id>/...
      (storage.foldername(name))[1] in (
        select id::text from public.clients
        where profile_id = auth.uid()
      )
      or public.get_my_role() = 'admin'
    )
  );

-- Nur Admin darf in den Bucket hochladen
create policy "storage: Admin uploaded Dokumente"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and public.get_my_role() = 'admin'
  );

-- Nur Admin darf Dateien löschen
create policy "storage: Admin löscht Dokumente"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and public.get_my_role() = 'admin'
  );
