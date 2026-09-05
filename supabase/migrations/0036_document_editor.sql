-- ============================================================
-- 0036 – Dokument-Editor: Positionsdetails, Freitexte, freier Empfänger
-- ============================================================
-- Drei Erweiterungen, die der neue Renderer (lib/documents/) braucht:
--
--   1. Positionen tragen jetzt eine mehrzeilige Beschreibung sowie optionale
--      Label-Overrides (z.B. "25,00 € p.M." als Einzelpreis mit "–" als Betrag
--      bei laufenden Care-Positionen) und ein Flag, das eine Zeile aus der
--      Summe heraushält.
--
--   2. Angebot und Rechnung bekommen freie Textblöcke (Einleitung/Schluss).
--
--   3. Empfänger ohne Kundendatensatz: `recipient` speichert Name und Anschrift
--      direkt am Dokument. Damit sind einmalige Rechnungen/Angebote möglich,
--      ohne dafür einen Kunden anlegen zu müssen.
--
--      Nebeneffekt, der GoBD-seitig eine echte Verbesserung ist: bei gesetztem
--      `recipient` ist die Anschrift zum Zeitpunkt der Rechnungsstellung
--      eingefroren. Bisher hing sie am Kundendatensatz — zieht ein Kunde um,
--      würde regenerateInvoicePdf() eine alte Rechnung mit NEUER Anschrift neu
--      erzeugen. Deshalb wird `recipient` künftig bei JEDER Rechnung beim
--      Stellen gefüllt, auch wenn ein client_id vorhanden ist.

-- ── 1. Positionen ───────────────────────────────────────────────────────────

alter table public.invoice_items add column if not exists beschreibung     text;
alter table public.invoice_items add column if not exists ep_label         text;
alter table public.invoice_items add column if not exists betrag_label     text;
alter table public.invoice_items add column if not exists exclude_from_sum boolean not null default false;

alter table public.offer_items   add column if not exists beschreibung     text;
alter table public.offer_items   add column if not exists ep_label         text;
alter table public.offer_items   add column if not exists betrag_label     text;
alter table public.offer_items   add column if not exists exclude_from_sum boolean not null default false;

-- ── 2. Freie Textblöcke ─────────────────────────────────────────────────────

alter table public.invoices add column if not exists einleitungstext text;
alter table public.invoices add column if not exists schlusstext     text;

alter table public.offers   add column if not exists einleitungstext text;
alter table public.offers   add column if not exists schlusstext     text;

-- ── 3. Empfänger ohne Kundendatensatz ───────────────────────────────────────
-- Form: { "name", "zusatz", "strasse", "plz", "ort", "land", "kundennummer", "email" }
-- Bewusst jsonb und keine acht Einzelspalten: der Block wird immer als Ganzes
-- geschrieben und gelesen (er ist ein Snapshot, kein abfragbares Stammdatum).

alter table public.invoices add column if not exists recipient jsonb;
alter table public.offers   add column if not exists recipient jsonb;

alter table public.invoices alter column client_id drop not null;

-- Ein Dokument braucht einen Empfänger — entweder als Kundenreferenz oder als
-- eingetragene Anschrift. Beides gleichzeitig ist erlaubt (Kunde ausgewählt,
-- Anschrift beim Stellen eingefroren).
alter table public.invoices drop constraint if exists invoices_empfaenger_vorhanden;
alter table public.invoices add constraint invoices_empfaenger_vorhanden
  check (client_id is not null or recipient is not null);

alter table public.offers drop constraint if exists offers_empfaenger_vorhanden;
alter table public.offers add constraint offers_empfaenger_vorhanden
  check (lead_id is not null or client_id is not null or recipient is not null);

-- ── 4. Angebotsnummern erst beim Stellen vergeben ───────────────────────────
-- Bisher zog createOffer() die AN-Nummer schon beim Anlegen. Mit dem neuen
-- Editor (Entwurf anlegen, mehrfach überarbeiten, dann stellen) würde das für
-- jeden verworfenen Entwurf eine Nummer verbrennen. Ab jetzt analog zu
-- issue_invoice(): Nummer + Statuswechsel in EINER Transaktion.

alter table public.offers alter column offer_number drop not null;

create or replace function public.issue_offer(p_id uuid)
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.offers;
  v_year  text;
  v_seq   integer;
  v_number text;
begin
  select * into v_offer from public.offers where id = p_id for update;

  if not found then
    raise exception 'Angebot % nicht gefunden.', p_id;
  end if;

  -- Idempotenter Fehlerpfad: ein bereits gestelltes Angebot behält seine Nummer.
  if v_offer.offer_number is not null then
    raise exception 'Angebot % hat bereits die Nummer %.', p_id, v_offer.offer_number;
  end if;

  v_year := to_char(current_date, 'YYYY');
  v_seq := public.get_next_number('AN', v_year);
  v_number := 'AN-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  update public.offers
  set offer_number = v_number,
      status       = 'gesendet',
      updated_at   = now()
  where id = p_id
  returning * into v_offer;

  return v_offer;
end;
$$;

-- security definer umgeht RLS — Ausführungsrecht deshalb ausschließlich für den
-- Service-Role-Key (unser Domain-Layer), analog zu issue_invoice().
revoke execute on function public.issue_offer(uuid) from public, anon, authenticated;
grant execute on function public.issue_offer(uuid) to service_role;

-- ── 5. GoBD-Unveränderlichkeit auf die neuen Felder ausdehnen ───────────────
-- enforce_invoice_immutability() zählt die geschützten Felder explizit auf.
-- Ohne diese Erweiterung ließen sich Empfängeranschrift und Schlusstext einer
-- bereits gestellten Rechnung nachträglich ändern — genau das darf nicht sein.
-- Der Rest der Funktion ist unverändert gegenüber 0008c.

create or replace function public.enforce_invoice_immutability()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'entwurf' then
      raise exception 'Gestellte Rechnungen können nicht gelöscht werden (GoBD).';
    end if;
    return old;
  end if;

  -- tg_op = 'UPDATE'
  if old.status = 'entwurf' then
    return new; -- Entwürfe sind frei editierbar (inkl. durch issue_invoice())
  end if;

  if new.invoice_number is distinct from old.invoice_number
    or new.client_id is distinct from old.client_id
    or new.project_id is distinct from old.project_id
    or new.invoice_date is distinct from old.invoice_date
    or new.service_date is distinct from old.service_date
    or new.ust_pflichtig is distinct from old.ust_pflichtig
    or new.total_net is distinct from old.total_net
    or new.recurring_source is distinct from old.recurring_source
    -- ab 0036 geschützt: Empfänger-Snapshot und Freitexte sind Bestandteil des
    -- gestellten Dokuments und dürfen sich danach nicht mehr ändern.
    or new.recipient is distinct from old.recipient
    or new.einleitungstext is distinct from old.einleitungstext
    or new.schlusstext is distinct from old.schlusstext
  then
    raise exception 'Gestellte Rechnungen sind unveränderlich (GoBD) — nur Status, pdf_url und Zahlungsdatum dürfen sich ändern.';
  end if;

  -- sent_at darf einmalig von NULL auf einen Zeitstempel wechseln (echter
  -- E-Mail-Versand über sendInvoice), danach nicht mehr.
  if old.sent_at is not null and new.sent_at is distinct from old.sent_at then
    raise exception 'sent_at ist nach dem Versand unveränderlich (GoBD).';
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
