-- ============================================================
-- 0023 – Rechnungsnummern: pro Kunde pro Jahr statt global pro Jahr
-- ============================================================
-- Bisher (0008/0008b/0008c): RE-<Jahr>-<lfd. Nr.>, ein einziger globaler
-- Nummernkreis pro Jahr über alle Kunden hinweg (z.B. RE-2026-001, RE-2026-002, …
-- egal welcher Kunde). Neu, nach Erics eigener Rechnungsvorlage
-- (public/Rechnung_Vorlage.pdf: "Rechnung Nr. YYYY-KDNRRNR"):
--
--   <Jahr>-<Kundennummer, 3-stellig><lfd. Nr. DIESES Kunden in diesem Jahr, 2-stellig>
--   Beispiel: Kunde KD-003, dritte Rechnung an ihn in 2026 -> 2026-00303
--
-- Der Nummernkreis (public.counters, siehe 0002_counters.sql) läuft dafür mit
-- scope_key = '<Kundenziffern>-<Jahr>' statt nur '<Jahr>' — pro Kombination aus
-- Kunde und Jahr ein eigener Zähler, der jedes Jahr wieder bei 1 beginnt.
--
-- Betrifft NUR künftig gestellte Rechnungen: bereits gestellte Rechnungen sind
-- GoBD-unveränderlich (enforce_invoice_immutability() blockt jede Änderung an
-- invoice_number) und behalten ihr bisheriges Format. Zum Zeitpunkt dieser
-- Migration ist ohnehin noch keine einzige Rechnung gestellt (geprüft).
--
-- create_credit_note()/GS-Nummern bleiben bewusst unverändert (global pro
-- Jahr) — nicht Teil dieser Anfrage.

create or replace function public.issue_invoice(p_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice       public.invoices;
  v_client_number text;
  v_client_digits text;
  v_year          text;
  v_seq           integer;
  v_number        text;
begin
  select * into v_invoice from public.invoices where id = p_id for update;

  if not found then
    raise exception 'Rechnung % nicht gefunden.', p_id;
  end if;

  if v_invoice.status <> 'entwurf' then
    raise exception 'Rechnung % wurde bereits gestellt (Status: %).', p_id, v_invoice.status;
  end if;

  select client_number into v_client_number from public.clients where id = v_invoice.client_id;
  if v_client_number is null then
    raise exception 'Kunde % der Rechnung % hat keine Kundennummer — Rechnungsnummer kann nicht gebildet werden.', v_invoice.client_id, p_id;
  end if;

  -- Nur die Ziffern der Kundennummer (z.B. 'KD-003' -> '003') — robust auch gegen
  -- abweichende Formate wie Test-Kunden ('KD-000-TEST' -> '000').
  v_client_digits := regexp_replace(v_client_number, '[^0-9]', '', 'g');
  v_year := to_char(current_date, 'YYYY');

  -- Zähler läuft jetzt pro Kunde+Jahr statt global pro Jahr — siehe Kommentar oben.
  v_seq := public.get_next_number('RE', v_client_digits || '-' || v_year);
  v_number := v_year || '-' || v_client_digits || lpad(v_seq::text, 2, '0');

  update public.invoices
  set invoice_number = v_number,
      invoice_date   = current_date,
      status         = 'versendet',
      updated_at     = now()
  where id = p_id
  returning * into v_invoice;

  return v_invoice;
end;
$$;

revoke execute on function public.issue_invoice(uuid) from public, anon, authenticated;
grant execute on function public.issue_invoice(uuid) to service_role;

comment on column public.invoices.invoice_number is
  'Ab Migration 0023: Format YYYY-KDNRRNR (Jahr + 3-stellige Kundennummer + 2-stellige laufende Nummer DIESES Kunden in diesem Jahr), z.B. 2026-00303. Vergeben ausschließlich durch issue_invoice(). Vor 0023 gestelltes Format RE-YYYY-NNN (falls vorhanden) bleibt GoBD-unveränderlich bestehen.';
