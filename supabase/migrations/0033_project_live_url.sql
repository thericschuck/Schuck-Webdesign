-- ============================================================
-- 0033 – Fertiger Website-Link pro Projekt, damit der Admin die
-- Live-URL im Projekt nachschlagen kann statt sie extern zu suchen.
-- ============================================================

alter table public.projects add column live_url text;
