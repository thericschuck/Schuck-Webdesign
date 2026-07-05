-- ============================================================
-- 0007 – Akquise & Pipeline (detailliertes Funnel-Schema)
-- ============================================================
-- Maßgeblich ist das detaillierte Funnel-Schema aus der JARVIS-Spec
-- (Bereich 5: leads → quali_calls → sales_calls → gewonnen), NICHT das
-- vereinfachte leads-Schema aus dem allgemeinen DB-Schema-Abschnitt.

create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  lead_number       text not null unique,          -- L-001, L-002 ... (eigener Nummernkreis)
  firmenname        text not null,
  ansprechpartner   text,
  position          text,
  zielgruppe        text,                           -- Freitext, änderbar ohne Migration
  stadt             text,
  website           text,
  phone             text,
  email             text,
  quelle            text,                           -- 'KI' | 'Google' | 'Netzwerk' | 'Website' | 'Empfehlung' | ...
  website_qualitaet text,                           -- 'Sehr schlecht' | 'Schlecht' | 'Ausbaufähig' | 'OK' | 'Gut' | 'Keine Website'
  prioritaet        text not null default 'medium'
                    check (prioritaet in ('high', 'medium', 'low')),
  erstkontakt_am    date,
  akquise_ergebnis  text not null default 'offen'
                    check (akquise_ergebnis in (
                      'offen', 'nicht_erreicht', 'wiedervorlage',
                      'kein_interesse', 'qualifiziert')),
  wiedervorlage     date,
  notizen           text,
  current_stage     text not null default 'erstkontakt'
                    check (current_stage in (
                      'erstkontakt', 'quali_call', 'closing_call', 'gewonnen', 'verloren')),
  client_id         uuid references public.clients(id), -- gesetzt wenn gewonnen (convert_lead_to_client)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.leads enable row level security;

create policy "leads: Admin verwaltet alle"
  on public.leads for all
  using (public.get_my_role() = 'admin');

create index if not exists leads_current_stage_idx on public.leads(current_stage);
create index if not exists leads_client_id_idx on public.leads(client_id);

-- ── quali_calls ──────────────────────────────────────────────

create table if not exists public.quali_calls (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references public.leads(id) on delete cascade,
  quali_call_am   date,
  quali_ergebnis  text not null default 'offen'
                  check (quali_ergebnis in ('offen', 'follow_up', 'qualifiziert', 'disqualifiziert')),
  wiedervorlage   date,
  bedarf_notizen  text,
  created_at      timestamptz not null default now()
);

alter table public.quali_calls enable row level security;

create policy "quali_calls: Admin verwaltet alle"
  on public.quali_calls for all
  using (public.get_my_role() = 'admin');

create index if not exists quali_calls_lead_id_idx on public.quali_calls(lead_id);

-- ── sales_calls ──────────────────────────────────────────────

create table if not exists public.sales_calls (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references public.leads(id) on delete cascade,
  closing_call_am date,
  leistungen      text,
  angebotsvolumen numeric(10,2),
  leistungsbeginn date,
  sales_ergebnis  text not null default 'offen'
                  check (sales_ergebnis in ('offen', 'follow_up', 'abgeschlossen', 'abgelehnt')),
  notizen         text,
  created_at      timestamptz not null default now()
);

alter table public.sales_calls enable row level security;

create policy "sales_calls: Admin verwaltet alle"
  on public.sales_calls for all
  using (public.get_my_role() = 'admin');

create index if not exists sales_calls_lead_id_idx on public.sales_calls(lead_id);

-- ── akquise_tracking (tägliches Kalt-Akquise-Log) ────────────

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

-- ── offers ───────────────────────────────────────────────────

create table if not exists public.offers (
  id             uuid primary key default gen_random_uuid(),
  offer_number   text not null unique,             -- AN-2026-001
  lead_id        uuid references public.leads(id),
  client_id      uuid references public.clients(id),
  status         text not null default 'entwurf'
                 check (status in ('entwurf', 'gesendet', 'angenommen', 'abgelehnt')),
  total_net      numeric(10,2),
  pdf_url        text,
  valid_until    date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.offers enable row level security;

create policy "offers: Admin verwaltet alle"
  on public.offers for all
  using (public.get_my_role() = 'admin');

create index if not exists offers_lead_id_idx on public.offers(lead_id);
create index if not exists offers_client_id_idx on public.offers(client_id);

-- ── offer_items ──────────────────────────────────────────────
-- bezeichnung/ep/gesamt werden bei Erstellung aus articles/packages kopiert
-- ("eingefroren") — spätere Katalogpreisänderungen ändern bestehende Angebote nicht.

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

create policy "offer_items: Admin verwaltet alle"
  on public.offer_items for all
  using (public.get_my_role() = 'admin');

create index if not exists offer_items_offer_id_idx on public.offer_items(offer_id);
