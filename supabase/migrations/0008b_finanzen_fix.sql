-- ============================================================
-- 0008b – Fix: issue_invoice()/create_credit_note() waren ohne
-- REVOKE/GRANT für anon/authenticated aufrufbar (security definer
-- umgeht RLS). Ersetzt außerdem den fehlerhaften internen
-- get_my_role()-Check, der auch den legitimen Service-Role-Aufrufpfad
-- blockiert hätte (auth.uid() ist bei Service-Role-Calls NULL).
-- ============================================================

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
      sent_at        = now(),
      updated_at     = now()
  where id = p_id
  returning * into v_invoice;

  return v_invoice;
end;
$$;

revoke execute on function public.issue_invoice(uuid) from public, anon, authenticated;
grant execute on function public.issue_invoice(uuid) to service_role;

create or replace function public.create_credit_note(p_invoice_id uuid, p_reason text, p_total_net numeric)
returns public.credit_notes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice     public.invoices;
  v_year        text;
  v_seq         integer;
  v_number      text;
  v_credit_note public.credit_notes;
begin
  select * into v_invoice from public.invoices where id = p_invoice_id for update;

  if not found then
    raise exception 'Rechnung % nicht gefunden.', p_invoice_id;
  end if;

  if v_invoice.status = 'entwurf' then
    raise exception 'Für Rechnungsentwürfe können keine Gutschriften erstellt werden — erst stellen.';
  end if;

  v_year := to_char(current_date, 'YYYY');
  v_seq := public.get_next_number('GS', v_year);
  v_number := 'GS-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  insert into public.credit_notes (credit_note_number, invoice_id, reason, total_net)
  values (v_number, p_invoice_id, p_reason, p_total_net)
  returning * into v_credit_note;

  return v_credit_note;
end;
$$;

revoke execute on function public.create_credit_note(uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.create_credit_note(uuid, text, numeric) to service_role;
