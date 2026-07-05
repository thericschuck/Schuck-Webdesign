-- ============================================================
-- 0006 – Produktkatalog (articles, packages, package_items)
-- ============================================================

create table if not exists public.articles (
  art_nr                text primary key,          -- z.B. 'SW-101', 'EX-02', 'EX-03-B'
  bezeichnung            text not null,
  beschreibung           text,
  preis_min              numeric(10,2),
  preis_max              numeric(10,2),
  einheit                text,                      -- 'Einmalig' | 'Monatlich' | 'Jährlich' | 'Stündlich'
  typ                    text,
  kategorie              text,                      -- 'Website Core' | 'Website Extra' | 'Betrieb' | 'Care' | 'SEO' | 'Telefonbot' | 'Add-on'
  pflichtbetrieb_art_nr  text references public.articles(art_nr),
  aktiv                  boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.articles enable row level security;

create policy "articles: Admin verwaltet alle"
  on public.articles for all
  using (public.get_my_role() = 'admin');

create index if not exists articles_kategorie_idx on public.articles(kategorie);

-- ── packages ─────────────────────────────────────────────────

create table if not exists public.packages (
  pkt_nr        text primary key,                   -- z.B. 'PKT-101'
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

-- ── package_items ────────────────────────────────────────────

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

create policy "package_items: Admin verwaltet alle"
  on public.package_items for all
  using (public.get_my_role() = 'admin');

create index if not exists package_items_pkt_nr_idx on public.package_items(pkt_nr);
