-- ============================================================
-- Schuck Webdesign – Supabase Schema
-- Ausführen im Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================


-- ============================================================
-- 0. ENUMS
-- ============================================================

create type public.user_role as enum ('admin', 'client');

create type public.client_status as enum ('active', 'inactive', 'pending');

-- ⚠️  MIGRATION – falls Schema bereits eingespielt: im SQL Editor ausführen:
-- ALTER TYPE public.client_status ADD VALUE IF NOT EXISTS 'pending';

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


-- ============================================================
-- 7. NEUE TABELLEN – Meetings, Messages, Change Requests, Reviews
-- ============================================================

-- meetings (Besprechungsprotokolle)
create table if not exists public.meetings (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects(id) on delete cascade,
  title            text not null,
  meeting_date     date not null,
  duration_minutes integer,
  notes            text,
  action_items     jsonb not null default '[]',
  created_at       timestamptz not null default now()
);
alter table public.meetings enable row level security;
create index if not exists meetings_project_id_idx on public.meetings(project_id);

create policy "meetings: Admin verwaltet alle"
  on public.meetings for all
  using (public.get_my_role() = 'admin');

create policy "meetings: Client liest eigene Projekte"
  on public.meetings for select
  using (
    exists (
      select 1 from public.projects p
      join public.clients c on c.id = p.client_id
      where p.id = meetings.project_id
        and c.profile_id = auth.uid()
    )
  );

-- messages (Direkte Kommunikation)
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  sender_id   uuid not null references auth.users(id),
  sender_role text not null check (sender_role in ('admin', 'client')),
  content     text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.messages enable row level security;
create index if not exists messages_project_id_idx on public.messages(project_id);

create policy "messages: Admin verwaltet alle"
  on public.messages for all
  using (public.get_my_role() = 'admin');

create policy "messages: Client sieht und sendet eigene"
  on public.messages for all
  using (
    exists (
      select 1 from public.projects p
      join public.clients c on c.id = p.client_id
      where p.id = messages.project_id
        and c.profile_id = auth.uid()
    )
  );

-- change_requests (Änderungsanfragen)
create table if not exists public.change_requests (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  submitted_by uuid not null references auth.users(id),
  title        text not null,
  description  text,
  status       text not null default 'open' check (status in ('open', 'in_progress', 'done', 'rejected')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.change_requests enable row level security;
create index if not exists change_requests_project_id_idx on public.change_requests(project_id);

create policy "change_requests: Admin verwaltet alle"
  on public.change_requests for all
  using (public.get_my_role() = 'admin');

create policy "change_requests: Client verwaltet eigene"
  on public.change_requests for all
  using (
    exists (
      select 1 from public.projects p
      join public.clients c on c.id = p.client_id
      where p.id = change_requests.project_id
        and c.profile_id = auth.uid()
    )
  );

-- reviews (Kundenbewertungen)
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  client_id   uuid not null references auth.users(id),
  rating      integer not null check (rating between 1 and 5),
  text        text not null,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.reviews enable row level security;
create index if not exists reviews_project_id_idx on public.reviews(project_id);
create unique index if not exists reviews_project_client_unique on public.reviews(project_id, client_id);

create policy "reviews: Admin verwaltet alle"
  on public.reviews for all
  using (public.get_my_role() = 'admin');

create policy "reviews: Client verwaltet eigene"
  on public.reviews for all
  using (client_id = auth.uid());

create policy "reviews: Öffentlich lesbar (approved + published)"
  on public.reviews for select
  using (published = true and status = 'approved');


-- ============================================================
-- MIGRATIONS – im Supabase SQL Editor ausführen falls Schema
-- bereits eingespielt wurde
-- ============================================================

-- 1. Adressfelder + interne Notizen für clients
alter table public.clients
  add column if not exists address_street  text,
  add column if not exists address_city    text,
  add column if not exists address_zip     text,
  add column if not exists address_country text default 'Deutschland',
  add column if not exists notes           text;

-- 2a. projects: neue Spalten (launch_date bereits vorhanden)
alter table public.projects
  add column if not exists internal_notes text,
  add column if not exists milestones     jsonb not null default '[]';

-- 2b. Ordner-Feld für documents (frei wählbarer Ordnername)
alter table public.documents
  add column if not exists folder text;

-- 3. Clients dürfen Dateien in ihr eigenes Storage-Verzeichnis hochladen
create policy "storage: Client uploaded eigene Dateien"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select id::text from public.clients where profile_id = auth.uid()
    )
  );

-- 4. Clients dürfen eigene Dokument-Rows eintragen
create policy "documents: Client lädt hoch"
  on public.documents for insert
  with check (
    (select profile_id from public.clients where id = documents.client_id) = auth.uid()
    and uploaded_by = auth.uid()
  );

-- 5. Clients dürfen ihre eigenen Uploads löschen
create policy "documents: Client löscht eigene Uploads"
  on public.documents for delete
  using (
    uploaded_by = auth.uid()
    and (select profile_id from public.clients where id = documents.client_id) = auth.uid()
  );

-- 6. Clients dürfen eigene Storage-Objekte löschen
create policy "storage: Client löscht eigene Dateien"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select id::text from public.clients where profile_id = auth.uid()
    )
  );

-- 7. Reviewer-Name und Firma direkt in reviews speichern (kein Join nötig für öffentliche Anzeige)
alter table public.reviews
  add column if not exists reviewer_name    text,
  add column if not exists reviewer_company text;

-- 8. Manuelle Bewertungen erlauben (ohne Portal-Account und ohne Projekt-Zuordnung)
alter table public.reviews
  alter column client_id  drop not null,
  alter column project_id drop not null;

drop index if exists reviews_project_client_unique;

-- 9. Interne To-Dos pro Projekt (nur Admin, nicht für Kunden sichtbar)
create table if not exists public.todos (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  done        boolean not null default false,
  priority    text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  due_date    date,
  created_at  timestamptz not null default now()
);
alter table public.todos enable row level security;
create index if not exists todos_project_id_idx on public.todos(project_id);

create policy "todos: Admin verwaltet alle"
  on public.todos for all
  using (public.get_my_role() = 'admin');

-- 10. Allgemeine To-Dos (ohne Projekt-Zuordnung)
ALTER TABLE public.todos ALTER COLUMN project_id DROP NOT NULL;

-- 11. Meeting-Verknüpfung für Todos (Aufgaben aus Besprechungen)
ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS meeting_id uuid
  REFERENCES public.meetings(id) ON DELETE SET NULL;

-- ============================================================
-- JARVIS – Phase 1: Kunden + Projekte (Fundament)
-- Siehe supabase/migrations/0001..0005 für die einzeln ausführbaren Skripte.
-- ============================================================

-- 12. client_status um JARVIS-Werte erweitern (eigene Transaktion nötig,
--     siehe migrations/0001_client_status_enum.sql)
-- alter type public.client_status add value if not exists 'lead';
-- alter type public.client_status add value if not exists 'paused';
-- alter type public.client_status add value if not exists 'completed';

-- 13. Nummernkreise
create table if not exists public.counters (
  typ         text not null,
  scope_key   text not null default '',
  last_value  integer not null default 0,
  unique (typ, scope_key)
);
alter table public.counters enable row level security;

create policy "counters: Admin verwaltet alle"
  on public.counters for all
  using (public.get_my_role() = 'admin');

create or replace function public.get_next_number(p_typ text, p_scope text default '')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  insert into public.counters (typ, scope_key, last_value)
  values (p_typ, p_scope, 1)
  on conflict (typ, scope_key)
  do update set last_value = public.counters.last_value + 1
  returning last_value into v_next;

  return v_next;
end;
$$;

-- 14. Kunden-/Projektnummern
alter table public.clients
  add column if not exists client_number text unique;   -- KD-001

alter table public.projects
  add column if not exists project_number text unique;  -- KD-001-001

-- 15. Human-in-the-Loop Zwischenspeicher für JARVIS
create table if not exists public.pending_actions (
  id           uuid primary key default gen_random_uuid(),
  tool_name    text not null,
  tool_args    jsonb not null,
  conversation jsonb not null,
  expires_at   timestamptz not null default (now() + interval '30 minutes'),
  created_at   timestamptz not null default now()
);
alter table public.pending_actions enable row level security;
create index if not exists pending_actions_expires_at_idx on public.pending_actions(expires_at);

create policy "pending_actions: Admin verwaltet alle"
  on public.pending_actions for all
  using (public.get_my_role() = 'admin');

-- 16. Backfill: bestehende Kunden/Projekte in Anlagereihenfolge nummerieren
--     (Details siehe migrations/0005_backfill_numbers.sql)

-- ============================================================
-- JARVIS – Phase 2: Produkte & Preise (Katalog-Import)
-- Siehe supabase/migrations/0006_products_catalog.sql
-- ============================================================

-- 17. Produktkatalog
create table if not exists public.articles (
  art_nr                text primary key,
  bezeichnung            text not null,
  beschreibung           text,
  preis_min              numeric(10,2),
  preis_max              numeric(10,2),
  einheit                text,
  typ                    text,
  kategorie              text,
  pflichtbetrieb_art_nr  text references public.articles(art_nr),
  aktiv                  boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
alter table public.articles enable row level security;
create index if not exists articles_kategorie_idx on public.articles(kategorie);

create policy "articles: Admin verwaltet alle"
  on public.articles for all
  using (public.get_my_role() = 'admin');

create table if not exists public.packages (
  pkt_nr        text primary key,
  paketname     text not null,
  paketpreis    numeric(10,2),
  zielgruppe    text,
  laufzeit      text,
  folgeprodukt  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.packages enable row level security;

create policy "packages: Admin verwaltet alle"
  on public.packages for all
  using (public.get_my_role() = 'admin');

create table if not exists public.package_items (
  pkt_nr  text not null references public.packages(pkt_nr) on delete cascade,
  art_nr  text not null references public.articles(art_nr),
  pos     integer not null,
  menge   numeric(10,2),
  ep      numeric(10,2),
  gesamt  numeric(10,2),
  primary key (pkt_nr, art_nr)
);
alter table public.package_items enable row level security;
create index if not exists package_items_pkt_nr_idx on public.package_items(pkt_nr);

create policy "package_items: Admin verwaltet alle"
  on public.package_items for all
  using (public.get_my_role() = 'admin');

-- 18. Import: scripts/import/import-catalog.ts (idempotent, upsert auf art_nr/pkt_nr)
--     liest scripts/import/Schuck_Webdesign_Produktkatalog.xlsx

-- ============================================================
-- JARVIS – Phase 3: Akquise & Pipeline (detailliertes Funnel-Schema)
-- Siehe supabase/migrations/0007_akquise.sql
-- ============================================================

-- 19. Leads (Funnel: erstkontakt → quali_call → closing_call → gewonnen/verloren)
create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  lead_number       text not null unique,
  firmenname        text not null,
  ansprechpartner   text,
  position          text,
  zielgruppe        text,
  stadt             text,
  website           text,
  phone             text,
  email             text,
  quelle            text,
  website_qualitaet text,
  prioritaet        text not null default 'medium' check (prioritaet in ('high', 'medium', 'low')),
  erstkontakt_am    date,
  akquise_ergebnis  text not null default 'offen'
                    check (akquise_ergebnis in ('offen', 'nicht_erreicht', 'wiedervorlage', 'kein_interesse', 'qualifiziert')),
  wiedervorlage     date,
  notizen           text,
  current_stage     text not null default 'erstkontakt'
                    check (current_stage in ('erstkontakt', 'quali_call', 'closing_call', 'gewonnen', 'verloren')),
  client_id         uuid references public.clients(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.leads enable row level security;
create index if not exists leads_current_stage_idx on public.leads(current_stage);
create index if not exists leads_client_id_idx on public.leads(client_id);

create policy "leads: Admin verwaltet alle"
  on public.leads for all
  using (public.get_my_role() = 'admin');

create table if not exists public.quali_calls (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references public.leads(id) on delete cascade,
  quali_call_am   date,
  quali_ergebnis  text not null default 'offen' check (quali_ergebnis in ('offen', 'follow_up', 'qualifiziert', 'disqualifiziert')),
  wiedervorlage   date,
  bedarf_notizen  text,
  created_at      timestamptz not null default now()
);
alter table public.quali_calls enable row level security;
create index if not exists quali_calls_lead_id_idx on public.quali_calls(lead_id);

create policy "quali_calls: Admin verwaltet alle"
  on public.quali_calls for all
  using (public.get_my_role() = 'admin');

create table if not exists public.sales_calls (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references public.leads(id) on delete cascade,
  closing_call_am date,
  leistungen      text,
  angebotsvolumen numeric(10,2),
  leistungsbeginn date,
  sales_ergebnis  text not null default 'offen' check (sales_ergebnis in ('offen', 'follow_up', 'abgeschlossen', 'abgelehnt')),
  notizen         text,
  created_at      timestamptz not null default now()
);
alter table public.sales_calls enable row level security;
create index if not exists sales_calls_lead_id_idx on public.sales_calls(lead_id);

create policy "sales_calls: Admin verwaltet alle"
  on public.sales_calls for all
  using (public.get_my_role() = 'admin');

-- 20. Tägliches Kalt-Akquise-Tracking
create table if not exists public.akquise_tracking (
  id                      uuid primary key default gen_random_uuid(),
  datum                   date not null unique,
  waehlversuche           integer not null default 0,
  gespraeche_empfang      integer not null default 0,
  gespraeche_entscheider  integer not null default 0,
  termine_vereinbart      integer not null default 0,
  created_at              timestamptz not null default now()
);
alter table public.akquise_tracking enable row level security;

create policy "akquise_tracking: Admin verwaltet alle"
  on public.akquise_tracking for all
  using (public.get_my_role() = 'admin');

-- 21. Angebote
create table if not exists public.offers (
  id             uuid primary key default gen_random_uuid(),
  offer_number   text not null unique,
  lead_id        uuid references public.leads(id),
  client_id      uuid references public.clients(id),
  status         text not null default 'entwurf' check (status in ('entwurf', 'gesendet', 'angenommen', 'abgelehnt')),
  total_net      numeric(10,2),
  pdf_url        text,
  valid_until    date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.offers enable row level security;
create index if not exists offers_lead_id_idx on public.offers(lead_id);
create index if not exists offers_client_id_idx on public.offers(client_id);

create policy "offers: Admin verwaltet alle"
  on public.offers for all
  using (public.get_my_role() = 'admin');

create table if not exists public.offer_items (
  id          uuid primary key default gen_random_uuid(),
  offer_id    uuid not null references public.offers(id) on delete cascade,
  art_nr      text references public.articles(art_nr),
  pos         integer not null,
  bezeichnung text not null,
  menge       numeric(10,2) not null default 1,
  ep          numeric(10,2) not null,
  gesamt      numeric(10,2) not null,
  created_at  timestamptz not null default now()
);
alter table public.offer_items enable row level security;
create index if not exists offer_items_offer_id_idx on public.offer_items(offer_id);

create policy "offer_items: Admin verwaltet alle"
  on public.offer_items for all
  using (public.get_my_role() = 'admin');

-- 22. Import: scripts/import/import-leads.ts (idempotent, dedupe auf firmenname+zielgruppe)
--     liest scripts/import/Schuck_Webdesign_Akquise.xlsx (Sheets "Akquise", "Quali-Calls", "Sales-Calls")
