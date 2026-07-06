-- ============================================================
-- 0012 – Bereich 7: Sub-Agenten + Externe Integrationen
-- ============================================================
-- (a) 'care_report' als neue document_category für den Care-Agent-Report
--     (analog zu 0008c_documents.sql, das 'offer' ergänzt hat).
-- (b) integration_calls protokolliert jeden Aufruf einer externen
--     Integration (Figma/GitHub/Vercel/GSC/PageSpeed/UptimeRobot/Vapi/GBP/
--     Calendar/Domain) — Datengrundlage für /admin/integrationen.

alter type public.document_category add value if not exists 'care_report';

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
