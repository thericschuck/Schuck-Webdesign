-- ============================================================
-- 0013 – integration_settings (nicht-geheime, editierbare Integrations-Werte)
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
