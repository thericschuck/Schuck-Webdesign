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
-- Hinweis: Der primäre Anzeigename ist profiles.full_name ("Kundenname"),
-- nicht company_name. company_name ist optionale Zusatzinfo (0011_client_name_optional.sql).
create table public.clients (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  company_name text,
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


-- ============================================================
-- JARVIS – Phase 4: Finanzen & Rechnungen (GoBD-konform)
-- Siehe supabase/migrations/0008_finanzen.sql
-- ============================================================

--   * RE-Nummern (Scope Jahr) werden ausschließlich über die Postgres-Funktion
--     issue_invoice() vergeben — Nummernvergabe + Statuswechsel in EINER
--     Transaktion, damit keine Nummer verbrannt werden kann.
--   * GS-Nummern (Scope Jahr) laufen analog über create_credit_note().
--   * Gestellte Rechnungen (status != 'entwurf') sind unveränderlich: ein
--     DB-Trigger blockiert UPDATE/DELETE außer den explizit erlaubten
--     Übergängen (versendet -> bezahlt/storniert, pdf_url-Retry).
--   * ust_pflichtig wird pro Rechnung beim Entwurf aus company_settings
--     eingefroren und ändert sich danach nie mehr rückwirkend.

-- 23. Firmenstammdaten (Singleton — genau eine Zeile)
create table if not exists public.company_settings (
  id              uuid primary key default gen_random_uuid(),
  company_name    text not null default '',
  inhaber         text,
  address_street  text,
  address_zip     text,
  address_city    text,
  address_country text not null default 'Deutschland',
  email           text,
  phone           text,
  website         text,
  iban            text,
  bic             text,
  steuernummer    text,
  ust_id          text,
  -- Aktueller Kleinunternehmer-Status (§19 UStG). Wird bei Rechnungserstellung
  -- pro Rechnung eingefroren — eine spätere Änderung hier wirkt sich NICHT
  -- rückwirkend auf bereits angelegte Rechnungen aus.
  ust_pflichtig   boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.company_settings enable row level security;

-- Erzwingt echte Singleton-Semantik: der Ausdruck `true` ist für jede Zeile
-- identisch, ein zweiter INSERT verletzt daher den Unique-Index.
create unique index if not exists company_settings_singleton_idx on public.company_settings ((true));

drop policy if exists "company_settings: Admin verwaltet alle" on public.company_settings;
create policy "company_settings: Admin verwaltet alle"
  on public.company_settings for all
  using (public.get_my_role() = 'admin');

-- 24. Rechnungen
create table if not exists public.invoices (
  id                uuid primary key default gen_random_uuid(),
  invoice_number    text unique,  -- RE-2026-001, NULL solange Entwurf
  client_id         uuid not null references public.clients(id),
  project_id        uuid references public.projects(id),
  status            text not null default 'entwurf'
                    check (status in ('entwurf', 'versendet', 'bezahlt', 'storniert')),
  invoice_date      date,             -- gesetzt durch issue_invoice() beim Stellen
  service_date      date,             -- Leistungsdatum (GoBD-Pflichtangabe)
  ust_pflichtig     boolean not null default false,  -- eingefroren beim Stellen
  total_net         numeric(10,2) not null default 0,
  pdf_url           text,             -- Pfad im privaten Storage-Bucket 'invoices'
  sent_at           timestamptz,
  paid_at           timestamptz,
  recurring_source  text,             -- Referenz auf wiederkehrende Quelle (z.B. Care-Abo), Vorbereitung Phase 7
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.invoices enable row level security;
create index if not exists invoices_client_id_idx on public.invoices(client_id);
create index if not exists invoices_project_id_idx on public.invoices(project_id);
create index if not exists invoices_status_idx on public.invoices(status);

drop policy if exists "invoices: Admin verwaltet alle" on public.invoices;
create policy "invoices: Admin verwaltet alle"
  on public.invoices for all
  using (public.get_my_role() = 'admin');

create table if not exists public.invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  art_nr      text references public.articles(art_nr),
  pos         integer not null,
  bezeichnung text not null,
  menge       numeric(10,2) not null default 1,
  ep          numeric(10,2) not null,
  gesamt      numeric(10,2) not null,
  created_at  timestamptz not null default now()
);
alter table public.invoice_items enable row level security;
create index if not exists invoice_items_invoice_id_idx on public.invoice_items(invoice_id);

drop policy if exists "invoice_items: Admin verwaltet alle" on public.invoice_items;
create policy "invoice_items: Admin verwaltet alle"
  on public.invoice_items for all
  using (public.get_my_role() = 'admin');

-- 25. Gutschriften (GoBD: Korrekturen an gestellten Rechnungen NUR über Gutschriften)
create table if not exists public.credit_notes (
  id                  uuid primary key default gen_random_uuid(),
  credit_note_number  text not null unique,  -- GS-2026-001
  invoice_id          uuid not null references public.invoices(id),
  reason              text,
  total_net           numeric(10,2) not null,
  pdf_url             text,
  created_at          timestamptz not null default now()
);
alter table public.credit_notes enable row level security;
create index if not exists credit_notes_invoice_id_idx on public.credit_notes(invoice_id);

drop policy if exists "credit_notes: Admin verwaltet alle" on public.credit_notes;
create policy "credit_notes: Admin verwaltet alle"
  on public.credit_notes for all
  using (public.get_my_role() = 'admin');

-- 26. issue_invoice() — zieht die RE-Nummer (Scope Jahr) und stellt die
--     Rechnung in EINER Transaktion. `for update` sperrt die Zeile gegen
--     gleichzeitiges Doppel-Stellen; der Status-Check verhindert erneutes
--     Stellen einer bereits gestellten Rechnung (idempotenter Fehlerpfad).
create or replace function public.issue_invoice(p_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices;
  v_year    text;
  v_seq     integer;
  v_number  text;
begin
  select * into v_invoice from public.invoices where id = p_id for update;

  if not found then
    raise exception 'Rechnung % nicht gefunden.', p_id;
  end if;

  if v_invoice.status <> 'entwurf' then
    raise exception 'Rechnung % wurde bereits gestellt (Status: %).', p_id, v_invoice.status;
  end if;

  v_year := to_char(current_date, 'YYYY');
  v_seq := public.get_next_number('RE', v_year);
  v_number := 'RE-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  update public.invoices
  set invoice_number = v_number,
      invoice_date   = current_date,
      status         = 'versendet',
      sent_at        = now(),
      updated_at     = now()
  where id = p_id
  returning * into v_invoice;

  return v_invoice;
end;
$$;

-- security definer umgeht RLS — ohne dieses REVOKE/GRANT könnte jeder
-- authentifizierte Client (z.B. Portal-Kunde) über einen direkten RPC-Aufruf
-- (supabase.rpc('issue_invoice', ...)) eine beliebige Rechnung stellen, da
-- PostgreSQL EXECUTE auf neue Funktionen sonst standardmäßig an PUBLIC vergibt.
-- Ein interner Rollen-Check in der Funktion (get_my_role()) funktioniert hier
-- NICHT, da auth.uid() bei Aufrufen über den Service-Role-Key (unser eigener
-- Domain-Layer) NULL ist — das würde den legitimen Aufrufpfad mitblockieren.
revoke execute on function public.issue_invoice(uuid) from public, anon, authenticated;
grant execute on function public.issue_invoice(uuid) to service_role;

-- 27. create_credit_note() — zieht die GS-Nummer (Scope Jahr) und legt die
--     Gutschrift in EINER Transaktion an (gleiches Nummernkreis-Prinzip wie
--     issue_invoice — auch eine verbrannte GS-Nummer wäre ein GoBD-Verstoß).
create or replace function public.create_credit_note(p_invoice_id uuid, p_reason text, p_total_net numeric)
returns public.credit_notes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice     public.invoices;
  v_year        text;
  v_seq         integer;
  v_number      text;
  v_credit_note public.credit_notes;
begin
  select * into v_invoice from public.invoices where id = p_invoice_id for update;

  if not found then
    raise exception 'Rechnung % nicht gefunden.', p_invoice_id;
  end if;

  if v_invoice.status = 'entwurf' then
    raise exception 'Für Rechnungsentwürfe können keine Gutschriften erstellt werden — erst stellen.';
  end if;

  v_year := to_char(current_date, 'YYYY');
  v_seq := public.get_next_number('GS', v_year);
  v_number := 'GS-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  insert into public.credit_notes (credit_note_number, invoice_id, reason, total_net)
  values (v_number, p_invoice_id, p_reason, p_total_net)
  returning * into v_credit_note;

  return v_credit_note;
end;
$$;

revoke execute on function public.create_credit_note(uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.create_credit_note(uuid, text, numeric) to service_role;

-- 28. Unveränderlichkeit gestellter Rechnungen (GoBD). Solange der Entwurf
--     läuft (status = 'entwurf') ist alles erlaubt — inkl. des Übergangs
--     durch issue_invoice(). Danach sind nur noch erlaubt:
--       * pdf_url setzen/erneuern (Retry nach fehlgeschlagener PDF-Erzeugung)
--       * Statuswechsel versendet -> bezahlt (mit paid_at) oder -> storniert
--     Löschen ist ab dem Moment des Stellens grundsätzlich verboten.
create or replace function public.enforce_invoice_immutability()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'entwurf' then
      raise exception 'Gestellte Rechnungen können nicht gelöscht werden (GoBD).';
    end if;
    return old;
  end if;

  -- tg_op = 'UPDATE'
  if old.status = 'entwurf' then
    return new; -- Entwürfe sind frei editierbar (inkl. durch issue_invoice())
  end if;

  if new.invoice_number is distinct from old.invoice_number
    or new.client_id is distinct from old.client_id
    or new.project_id is distinct from old.project_id
    or new.invoice_date is distinct from old.invoice_date
    or new.service_date is distinct from old.service_date
    or new.ust_pflichtig is distinct from old.ust_pflichtig
    or new.total_net is distinct from old.total_net
    or new.sent_at is distinct from old.sent_at
    or new.recurring_source is distinct from old.recurring_source
  then
    raise exception 'Gestellte Rechnungen sind unveränderlich (GoBD) — nur Status, pdf_url und Zahlungsdatum dürfen sich ändern.';
  end if;

  if new.status is distinct from old.status then
    if not (old.status = 'versendet' and new.status in ('bezahlt', 'storniert')) then
      raise exception 'Unzulässiger Statuswechsel von % auf % (GoBD).', old.status, new.status;
    end if;
  end if;

  if new.paid_at is distinct from old.paid_at and new.status <> 'bezahlt' then
    raise exception 'paid_at darf nur beim Statuswechsel auf bezahlt gesetzt werden.';
  end if;

  return new;
end;
$$;

drop trigger if exists invoices_immutability_trigger on public.invoices;
create trigger invoices_immutability_trigger
  before update or delete on public.invoices
  for each row execute function public.enforce_invoice_immutability();

-- 29. Unveränderlichkeit der Positionen gestellter Rechnungen — dieselbe
--     GoBD-Logik wie oben, aber am Elternstatus geprüft.
create or replace function public.enforce_invoice_items_immutability()
returns trigger
language plpgsql
as $$
declare
  v_invoice_id uuid;
  v_status     text;
begin
  v_invoice_id := coalesce(new.invoice_id, old.invoice_id);
  select status into v_status from public.invoices where id = v_invoice_id;

  if v_status is not null and v_status <> 'entwurf' then
    raise exception 'Positionen gestellter Rechnungen können nicht mehr geändert werden (GoBD).';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists invoice_items_immutability_trigger on public.invoice_items;
create trigger invoice_items_immutability_trigger
  before insert or update or delete on public.invoice_items
  for each row execute function public.enforce_invoice_items_immutability();

-- 30. STORAGE – Bucket 'invoices' (privat, ausschließlich Admin)
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

drop policy if exists "storage: Admin verwaltet Rechnungs-PDFs" on storage.objects;
create policy "storage: Admin verwaltet Rechnungs-PDFs"
  on storage.objects for all
  using (bucket_id = 'invoices' and public.get_my_role() = 'admin')
  with check (bucket_id = 'invoices' and public.get_my_role() = 'admin');

-- ============================================================
-- 31. Dokumente-Feature (JARVIS Bereich 4)
-- ============================================================

-- Angebots-PDFs bekommen eine eigene documents.category statt 'other'.
alter type public.document_category add value if not exists 'offer';

-- sent_at bedeutet ab sofort "tatsächlich per E-Mail versendet" (gesetzt durch
-- lib/domain/finance.ts#sendInvoice), nicht mehr "gestellt am" — issue_invoice()
-- setzt es daher nicht mehr selbst.
create or replace function public.issue_invoice(p_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices;
  v_year    text;
  v_seq     integer;
  v_number  text;
begin
  select * into v_invoice from public.invoices where id = p_id for update;

  if not found then
    raise exception 'Rechnung % nicht gefunden.', p_id;
  end if;

  if v_invoice.status <> 'entwurf' then
    raise exception 'Rechnung % wurde bereits gestellt (Status: %).', p_id, v_invoice.status;
  end if;

  v_year := to_char(current_date, 'YYYY');
  v_seq := public.get_next_number('RE', v_year);
  v_number := 'RE-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  update public.invoices
  set invoice_number = v_number,
      invoice_date   = current_date,
      status         = 'versendet',
      updated_at     = now()
  where id = p_id
  returning * into v_invoice;

  return v_invoice;
end;
$$;

revoke execute on function public.issue_invoice(uuid) from public, anon, authenticated;
grant execute on function public.issue_invoice(uuid) to service_role;

-- enforce_invoice_immutability(): sent_at darf jetzt einmalig von NULL auf
-- einen Zeitstempel wechseln (echter E-Mail-Versand über sendInvoice) —
-- danach ist auch sent_at unveränderlich, wie alle anderen GoBD-Felder.
create or replace function public.enforce_invoice_immutability()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'entwurf' then
      raise exception 'Gestellte Rechnungen können nicht gelöscht werden (GoBD).';
    end if;
    return old;
  end if;

  -- tg_op = 'UPDATE'
  if old.status = 'entwurf' then
    return new; -- Entwürfe sind frei editierbar (inkl. durch issue_invoice())
  end if;

  if new.invoice_number is distinct from old.invoice_number
    or new.client_id is distinct from old.client_id
    or new.project_id is distinct from old.project_id
    or new.invoice_date is distinct from old.invoice_date
    or new.service_date is distinct from old.service_date
    or new.ust_pflichtig is distinct from old.ust_pflichtig
    or new.total_net is distinct from old.total_net
    or new.recurring_source is distinct from old.recurring_source
  then
    raise exception 'Gestellte Rechnungen sind unveränderlich (GoBD) — nur Status, pdf_url, sent_at (einmalig) und Zahlungsdatum dürfen sich ändern.';
  end if;

  if new.sent_at is distinct from old.sent_at and old.sent_at is not null then
    raise exception 'sent_at wurde bereits gesetzt und kann nicht mehr geändert werden.';
  end if;

  if new.status is distinct from old.status then
    if not (old.status = 'versendet' and new.status in ('bezahlt', 'storniert')) then
      raise exception 'Unzulässiger Statuswechsel von % auf % (GoBD).', old.status, new.status;
    end if;
  end if;

  if new.paid_at is distinct from old.paid_at and new.status <> 'bezahlt' then
    raise exception 'paid_at darf nur beim Statuswechsel auf bezahlt gesetzt werden.';
  end if;

  return new;
end;
$$;

-- ============================================================
-- 32. Knowledge Graph (JARVIS Bereich 1 "Das Gehirn")
-- ============================================================

create extension if not exists vector;

create table if not exists public.nodes (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in (
                'client', 'project', 'contact', 'fact', 'preference', 'note', 'process', 'product', 'session'
              )),
  label       text not null,
  body        text,
  ref_id      uuid,
  ref_table   text,
  source      text not null default 'jarvis_auto'
              check (source in ('jarvis_auto', 'user_explicit', 'imported')),
  confidence  text not null default 'high'
              check (confidence in ('high', 'medium', 'low', 'deprecated')),
  embedding   vector(1536),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.nodes enable row level security;

create index if not exists nodes_ref_idx on public.nodes(ref_table, ref_id);
create index if not exists nodes_type_idx on public.nodes(type);
create index if not exists nodes_embedding_hnsw_idx
  on public.nodes using hnsw (embedding vector_cosine_ops);

drop policy if exists "nodes: Admin verwaltet alle" on public.nodes;
create policy "nodes: Admin verwaltet alle"
  on public.nodes for all
  using (public.get_my_role() = 'admin');

create table if not exists public.edges (
  id         uuid primary key default gen_random_uuid(),
  from_id    uuid not null references public.nodes(id) on delete cascade,
  to_id      uuid not null references public.nodes(id) on delete cascade,
  type       text not null check (type in (
               'has_project', 'has_contact', 'mentioned_in', 'contradicts',
               'confirms', 'relates_to', 'learned_from', 'part_of_session'
             )),
  weight     float not null default 1.0,
  created_at timestamptz not null default now(),
  unique (from_id, to_id, type)
);
alter table public.edges enable row level security;

create index if not exists edges_from_idx on public.edges(from_id);
create index if not exists edges_to_idx on public.edges(to_id);

drop policy if exists "edges: Admin verwaltet alle" on public.edges;
create policy "edges: Admin verwaltet alle"
  on public.edges for all
  using (public.get_my_role() = 'admin');

create table if not exists public.conversation_logs (
  id         uuid primary key default gen_random_uuid(),
  node_id    uuid references public.nodes(id) on delete set null,
  messages   jsonb not null default '[]',
  summary    text,
  created_at timestamptz not null default now()
);
alter table public.conversation_logs enable row level security;

drop policy if exists "conversation_logs: Admin verwaltet alle" on public.conversation_logs;
create policy "conversation_logs: Admin verwaltet alle"
  on public.conversation_logs for all
  using (public.get_my_role() = 'admin');

create or replace function public.link_nodes(p_from uuid, p_to uuid, p_type text, p_weight float default 1.0)
returns public.edges
language plpgsql
security definer
set search_path = public
as $$
declare
  v_edge public.edges;
begin
  insert into public.edges (from_id, to_id, type, weight)
  values (p_from, p_to, p_type, p_weight)
  on conflict (from_id, to_id, type)
  do update set weight = public.edges.weight + 1
  returning * into v_edge;

  return v_edge;
end;
$$;

revoke execute on function public.link_nodes(uuid, uuid, text, float) from public, anon, authenticated;
grant execute on function public.link_nodes(uuid, uuid, text, float) to service_role;

create or replace function public.match_nodes(query_embedding vector(1536), match_count int default 20)
returns setof public.nodes
language sql
stable
set search_path = public
as $$
  select *
  from public.nodes
  where confidence != 'deprecated'
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

revoke execute on function public.match_nodes(vector, int) from public, anon, authenticated;
grant execute on function public.match_nodes(vector, int) to service_role;

-- ============================================================
-- 33. Kundenname (profiles.full_name) statt Firmenname primär
-- ============================================================

alter table public.clients alter column company_name drop not null;

-- ============================================================
-- 34. Bereich 7: Sub-Agenten + Externe Integrationen
-- ============================================================

-- Care-Agent-Reports bekommen eine eigene documents.category statt 'other'.
alter type public.document_category add value if not exists 'care_report';

-- Protokoll jedes Aufrufs einer externen Integration (Figma/GitHub/Vercel/
-- GSC/PageSpeed/UptimeRobot/Vapi/GBP/Calendar/Domain) — Datengrundlage für
-- /admin/integrationen ("letzter erfolgreicher Call").
create table if not exists public.integration_calls (
  id            uuid primary key default gen_random_uuid(),
  service       text not null,
  success       boolean not null,
  error_message text,
  called_at     timestamptz not null default now()
);

alter table public.integration_calls enable row level security;

create policy "integration_calls: Admin liest alle"
  on public.integration_calls for select
  using (public.get_my_role() = 'admin');

create index if not exists integration_calls_service_called_at_idx
  on public.integration_calls (service, called_at desc);

-- ============================================================
-- 35. integration_settings (nicht-geheime, editierbare Integrations-Werte)
-- ============================================================
-- Für Werte wie "Figma-Token wurde am X erzeugt", die NICHT in .env.local gehören
-- (kein Secret, ändert sich, soll ohne Server-Neustart/.env-Edit setzbar sein) —
-- editierbar über /admin/integrationen statt über eine Textdatei.

create table if not exists public.integration_settings (
  service    text not null,
  key        text not null,
  value      text,
  updated_at timestamptz not null default now(),
  primary key (service, key)
);

alter table public.integration_settings enable row level security;

create policy "integration_settings: Admin verwaltet alle"
  on public.integration_settings for all
  using (public.get_my_role() = 'admin');

-- ============================================================
-- 36. Kunden anlegen ohne Portal-Einladung
-- ============================================================
-- profile_id war bisher zwingend (jeder Kunde brauchte einen Auth-User/Invite).
-- contact_name/contact_email erlauben, einen Kunden vollständig zu verwalten,
-- bevor (oder ohne dass) eine Portal-Einladung verschickt wird.

alter table public.clients alter column profile_id drop not null;
alter table public.clients add column if not exists contact_name text;
alter table public.clients add column if not exists contact_email text;

-- Backfill: bestehende (bereits eingeladene) Kunden bekommen ihre Kontaktdaten auch auf
-- clients gespiegelt, damit alte und neue Kunden derselben Anzeige-/Fallback-Logik folgen.
update public.clients c
set contact_name = coalesce(c.contact_name, p.full_name),
    contact_email = coalesce(c.contact_email, p.email)
from public.profiles p
where p.id = c.profile_id and (c.contact_name is null or c.contact_email is null);
