-- ============================================================
-- 0031 – Vorname/Nachname als separate Felder neben dem freien
-- Anzeigenamen (contact_name / profiles.full_name).
-- ============================================================

alter table public.clients add column first_name text;
alter table public.clients add column last_name text;
