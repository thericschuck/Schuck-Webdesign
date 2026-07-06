-- ============================================================
-- 0008c – Dokumente-Feature (JARVIS Bereich 4)
-- Nachgeholt: diese Änderungen wurden bereits in schema.sql eingespielt,
-- hatten aber noch keine eigene nummerierte Migrationsdatei.
-- ============================================================

-- Angebots-PDFs bekommen eine eigene documents.category statt 'other'.
alter type public.document_category add value if not exists 'offer';

-- sent_at bedeutet ab sofort "tatsächlich per E-Mail versendet" (gesetzt durch
-- lib/domain/finance.ts#sendInvoice), nicht mehr "gestellt am" — issue_invoice()
-- setzt es daher nicht mehr selbst.
create or replace function public.issue_invoice(p_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices;
  v_year    text;
  v_seq     integer;
  v_number  text;
begin
  select * into v_invoice from public.invoices where id = p_id for update;

  if not found then
    raise exception 'Rechnung % nicht gefunden.', p_id;
  end if;

  if v_invoice.status <> 'entwurf' then
    raise exception 'Rechnung % wurde bereits gestellt (Status: %).', p_id, v_invoice.status;
  end if;

  v_year := to_char(current_date, 'YYYY');
  v_seq := public.get_next_number('RE', v_year);
  v_number := 'RE-' || v_year || '-' || lpad(v_seq::text, 3, '0');

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

-- enforce_invoice_immutability(): sent_at darf jetzt einmalig von NULL auf
-- einen Zeitstempel wechseln (echter E-Mail-Versand über sendInvoice) —
-- danach ist auch sent_at unveränderlich, wie alle anderen GoBD-Felder.
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
  then
    raise exception 'Gestellte Rechnungen sind unveränderlich (GoBD) — nur Status, pdf_url, sent_at (einmalig) und Zahlungsdatum dürfen sich ändern.';
  end if;

  if new.sent_at is distinct from old.sent_at and old.sent_at is not null then
    raise exception 'sent_at wurde bereits gesetzt und kann nicht mehr geändert werden.';
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
