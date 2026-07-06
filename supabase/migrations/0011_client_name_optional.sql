-- ============================================================
-- 0011 – Kundenname (profiles.full_name) statt Firmenname als
-- primäre Bezeichnung. company_name wird dadurch optional.
-- ============================================================

alter table public.clients alter column company_name drop not null;
