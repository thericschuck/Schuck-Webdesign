-- ============================================================
-- 0027 – Rechnungen: Testrechnungen + Nachtragen bereits ausgestellter Rechnungen
-- ============================================================
-- Zwei neue, unabhängige Fähigkeiten für lib/domain/finance.ts:
--
-- 1. is_test: Rechnungen, die nur zum Ausprobieren des Systems dienen. Eigener
--    Nummernkreis (TEST-JJJJ-NNN über get_next_number('TEST', Jahr), siehe
--    lib/domain/finance.ts issueInvoice()) statt der echten RE-Kette — kollidiert
--    nie mit echten Rechnungsnummern. Im Gegensatz zu echten Rechnungen sind
--    Testrechnungen NICHT GoBD-unveränderlich: die Trigger unten lassen für
--    is_test=true jede Änderung/Löschung zu, unabhängig vom Status. Werden aus
--    Umsatzstatistik (getRevenueOverview) und Standard-Listenansicht ausgeblendet.
--
-- 2. is_backfilled: reines Info-Flag für Rechnungen, die außerhalb dieses Systems
--    bereits gestellt wurden (Altbeleg) und hier nur nachträglich erfasst werden.
--    Diese bleiben wie normale Rechnungen GoBD-unveränderlich — KEINE Trigger-
--    Änderung nötig, siehe Kommentar in createBackfilledInvoice() (lib/domain/finance.ts):
--    Header wird als 'entwurf' angelegt, Positionen eingefügt, dann in einem
--    einzigen UPDATE auf den Zielstatus samt manueller invoice_number gebracht —
--    das ist laut enforce_invoice_immutability() erlaubt, solange old.status
--    noch 'entwurf' ist (identisch zum reglären issue_invoice()-Übergang, nur
--    mit von Hand vergebener statt gezogener Nummer).

alter table public.invoices add column if not exists is_test boolean not null default false;
alter table public.invoices add column if not exists is_backfilled boolean not null default false;
create index if not exists invoices_is_test_idx on public.invoices(is_test) where is_test;

create or replace function public.enforce_invoice_immutability()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'entwurf' and not old.is_test then
      raise exception 'Gestellte Rechnungen können nicht gelöscht werden (GoBD).';
    end if;
    return old;
  end if;

  -- tg_op = 'UPDATE'
  if old.status = 'entwurf' or old.is_test then
    return new; -- Entwürfe und Testrechnungen sind frei editierbar
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

create or replace function public.enforce_invoice_items_immutability()
returns trigger
language plpgsql
as $$
declare
  v_invoice_id uuid;
  v_status     text;
  v_is_test    boolean;
begin
  v_invoice_id := coalesce(new.invoice_id, old.invoice_id);
  select status, is_test into v_status, v_is_test from public.invoices where id = v_invoice_id;

  if v_status is not null and v_status <> 'entwurf' and not coalesce(v_is_test, false) then
    raise exception 'Positionen gestellter Rechnungen können nicht mehr geändert werden (GoBD).';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

comment on column public.invoices.is_test is
  'Testrechnung — eigener Nummernkreis (TEST-JJJJ-NNN), aus Umsatzstatistik/Standardliste ausgeblendet, nicht GoBD-unveränderlich (frei editier-/löschbar, siehe enforce_invoice_immutability()).';
comment on column public.invoices.is_backfilled is
  'Informativ: Rechnung wurde außerhalb dieses Systems bereits gestellt und hier nur nachträglich mit ihrer ursprünglichen Nummer erfasst (siehe createBackfilledInvoice() in lib/domain/finance.ts). Bleibt GoBD-unveränderlich wie jede andere gestellte Rechnung.';
