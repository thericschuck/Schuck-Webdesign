-- ============================================================
-- 0028 – Akquise Google-Sheet-Sync
-- ============================================================
-- Das Akquise-Google-Sheet ist die primäre Eingabe-Oberfläche (Lead-Stammdaten,
-- Akquise-/Quali-/Sales-Ergebnis, Tages-Tracking). Diese Migration bereitet die
-- Tabellen für einen wiederholbaren Sheet→DB-Sync vor (statt des bisherigen
-- Insert-only-Imports aus scripts/import/import-leads.ts).

-- ── leads: stabiler Fremdschlüssel zur Sheet-eigenen ID-Spalte (z.B. "L-047") ──
-- NULL für rein manuell in der App angelegte Leads (kein Sheet-Gegenstück).

alter table public.leads add column if not exists sheet_lead_id text;
alter table public.leads add column if not exists last_synced_at timestamptz;

create unique index if not exists leads_sheet_lead_id_key
  on public.leads(sheet_lead_id)
  where sheet_lead_id is not null;

-- ── quali_calls / sales_calls: im Sheet gibt es pro Lead genau eine Zeile pro
-- Phase — Unique-Constraint ermöglicht echtes upsert(onConflict: 'lead_id')
-- statt der bisherigen manuellen Skip-falls-vorhanden-Logik.

alter table public.quali_calls add constraint quali_calls_lead_id_key unique (lead_id);
alter table public.sales_calls add constraint sales_calls_lead_id_key unique (lead_id);

-- ── akquise_tracking: mehrere Personen tragen ein (Eric, Malik, ...) — bisher
-- war "datum" allein unique (ein Team-Gesamtwert/Tag), jetzt (datum, wer).

alter table public.akquise_tracking add column if not exists wer text not null default 'Eric';

alter table public.akquise_tracking drop constraint if exists akquise_tracking_datum_key;
alter table public.akquise_tracking add constraint akquise_tracking_datum_wer_key unique (datum, wer);
