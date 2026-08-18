-- ============================================================
-- 0025 – Rechnungsnummer bekommt wieder das RE-Präfix
-- ============================================================
-- 0023 hatte das Präfix bewusst weggelassen (Format YYYY-KDNRRNR, nach der Vorlage
-- public/Rechnung_Vorlage.pdf). Auf Wunsch jetzt wieder mit Präfix, konsistent zu den
-- anderen Nummernkreisen (AN-JJJJ-xxx, GS-JJJJ-xxx, L-xxx):
--
--   RE-<Jahr>-<Kundennummer, 3-stellig><lfd. Nr. DIESES Kunden in diesem Jahr, 2-stellig>
--   Beispiel: erste Rechnung des Kunden KD-002 in 2026 -> RE-2026-00201
--
-- Außerdem: Migration 0023 hat den Nummernkreis von "global pro Jahr" (scope_key = Jahr)
-- auf "pro Kunde pro Jahr" (scope_key = Kundenziffern-Jahr) umgestellt, die alte,
-- global gezählte counters-Zeile aber nie aufgeräumt — die blieb als toter, nie wieder
-- inkrementierter Nummernkreis stehen und erschien im Cockpit als zweite, verwirrende
-- "Rechnungen"-Kachel neben der neuen. Wird hier bereinigt.

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

  v_client_digits := regexp_replace(v_client_number, '[^0-9]', '', 'g');
  v_year := to_char(current_date, 'YYYY');

  -- Zähler bleibt pro Kunde+Jahr (unverändert seit 0023) — nur die Textform bekommt das
  -- RE-Präfix zurück.
  v_seq := public.get_next_number('RE', v_client_digits || '-' || v_year);
  v_number := 'RE-' || v_year || '-' || v_client_digits || lpad(v_seq::text, 2, '0');

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
  'Ab Migration 0025: Format RE-YYYY-KDNRRNR (Präfix + Jahr + 3-stellige Kundennummer + 2-stellige laufende Nummer DIESES Kunden in diesem Jahr), z.B. RE-2026-00201. Vergeben ausschließlich durch issue_invoice(). Frühere Formate (RE-YYYY-NNN vor 0023, YYYY-KDNRRNR zwischen 0023 und 0025) bleiben GoBD-unveränderlich bestehen, falls vorhanden.';

-- Alte, seit 0023 tote counters-Zeile(n) für den globalen Jahres-Nummernkreis entfernen —
-- erkennbar am scope_key, der (anders als das neue "<Kundenziffern>-<Jahr>"-Format) nur
-- aus 4 Ziffern besteht (reines Jahr, kein Bindestrich).
delete from public.counters where typ = 'RE' and scope_key ~ '^[0-9]{4}$';
