-- ============================================================
-- 0003 – Kunden-/Projektnummern
-- ============================================================
-- Format: clients.client_number  = 'KD-001'          (global fortlaufend)
--         projects.project_number = 'KD-001-001'      (fortlaufend pro Kunde)

alter table public.clients
  add column if not exists client_number text unique;

alter table public.projects
  add column if not exists project_number text unique;
