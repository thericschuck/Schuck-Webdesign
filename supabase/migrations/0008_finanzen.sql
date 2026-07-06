-- ============================================================
-- 0008 – Finanzen & Rechnungen (GoBD-konform)
-- ============================================================
-- Grundsätze:
--   * RE-Nummern (Scope Jahr) werden ausschließlich über die Postgres-Funktion
--     issue_invoice() vergeben — Nummernvergabe + Statuswechsel in EINER
--     Transaktion, damit keine Nummer verbrannt werden kann.
--   * GS-Nummern (Scope Jahr) laufen analog über create_credit_note().
--   * Gestellte Rechnungen (status != 'entwurf') sind unveränderlich: ein
--     DB-Trigger blockiert UPDATE/DELETE außer den explizit erlaubten
--     Übergängen (versendet -> bezahlt/storniert, pdf_url-Retry).
--   * ust_pflichtig wird pro Rechnung beim Entwurf aus company_settings
--     eingefroren und ändert sich danach nie mehr rückwirkend.

-- 23. Firmenstammdaten (Singleton — genau eine Zeile)
create table if not exists public.company_settings (
  id              uuid primary key default gen_random_uuid(),
  company_name    text not null default '',
  inhaber         text,
  address_street  text,
  address_zip     text,
  address_city    text,
  address_country text not null default 'Deutschland',
  email           text,
  phone           text,
  website         text,
  iban            text,
  bic             text,
  steuernummer    text,
  ust_id          text,
  -- Aktueller Kleinunternehmer-Status (§19 UStG). Wird bei Rechnungserstellung
  -- pro Rechnung eingefroren — eine spätere Änderung hier wirkt sich NICHT
  -- rückwirkend auf bereits angelegte Rechnungen aus.
  ust_pflichtig   boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.company_settings enable row level security;

-- Erzwingt echte Singleton-Semantik: der Ausdruck `true` ist für jede Zeile
-- identisch, ein zweiter INSERT verletzt daher den Unique-Index.
create unique index if not exists company_settings_singleton_idx on public.company_settings ((true));

drop policy if exists "company_settings: Admin verwaltet alle" on public.company_settings;
create policy "company_settings: Admin verwaltet alle"
  on public.company_settings for all
  using (public.get_my_role() = 'admin');

-- 24. Rechnungen
create table if not exists public.invoices (
  id                uuid primary key default gen_random_uuid(),
  invoice_number    text unique,  -- RE-2026-001, NULL solange Entwurf
  client_id         uuid not null references public.clients(id),
  project_id        uuid references public.projects(id),
  status            text not null default 'entwurf'
                    check (status in ('entwurf', 'versendet', 'bezahlt', 'storniert')),
  invoice_date      date,             -- gesetzt durch issue_invoice() beim Stellen
  service_date      date,             -- Leistungsdatum (GoBD-Pflichtangabe)
  ust_pflichtig     boolean not null default false,  -- eingefroren beim Stellen
  total_net         numeric(10,2) not null default 0,
  pdf_url           text,             -- Pfad im privaten Storage-Bucket 'invoices'
  sent_at           timestamptz,
  paid_at           timestamptz,
  recurring_source  text,             -- Referenz auf wiederkehrende Quelle (z.B. Care-Abo), Vorbereitung Phase 7
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.invoices enable row level security;
create index if not exists invoices_client_id_idx on public.invoices(client_id);
create index if not exists invoices_project_id_idx on public.invoices(project_id);
create index if not exists invoices_status_idx on public.invoices(status);

drop policy if exists "invoices: Admin verwaltet alle" on public.invoices;
create policy "invoices: Admin verwaltet alle"
  on public.invoices for all
  using (public.get_my_role() = 'admin');

create table if not exists public.invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  art_nr      text references public.articles(art_nr),
  pos         integer not null,
  bezeichnung text not null,
  menge       numeric(10,2) not null default 1,
  ep          numeric(10,2) not null,
  gesamt      numeric(10,2) not null,
  created_at  timestamptz not null default now()
);
alter table public.invoice_items enable row level security;
create index if not exists invoice_items_invoice_id_idx on public.invoice_items(invoice_id);

drop policy if exists "invoice_items: Admin verwaltet alle" on public.invoice_items;
create policy "invoice_items: Admin verwaltet alle"
  on public.invoice_items for all
  using (public.get_my_role() = 'admin');

-- 25. Gutschriften (GoBD: Korrekturen an gestellten Rechnungen NUR über Gutschriften)
create table if not exists public.credit_notes (
  id                  uuid primary key default gen_random_uuid(),
  credit_note_number  text not null unique,  -- GS-2026-001
  invoice_id          uuid not null references public.invoices(id),
  reason              text,
  total_net           numeric(10,2) not null,
  pdf_url             text,
  created_at          timestamptz not null default now()
);
alter table public.credit_notes enable row level security;
create index if not exists credit_notes_invoice_id_idx on public.credit_notes(invoice_id);

drop policy if exists "credit_notes: Admin verwaltet alle" on public.credit_notes;
create policy "credit_notes: Admin verwaltet alle"
  on public.credit_notes for all
  using (public.get_my_role() = 'admin');

-- 26. issue_invoice() — zieht die RE-Nummer (Scope Jahr) und stellt die
--     Rechnung in EINER Transaktion. `for update` sperrt die Zeile gegen
--     gleichzeitiges Doppel-Stellen; der Status-Check verhindert erneutes
--     Stellen einer bereits gestellten Rechnung (idempotenter Fehlerpfad).
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

-- security definer umgeht RLS — ohne dieses REVOKE/GRANT könnte jeder
-- authentifizierte Client (z.B. Portal-Kunde) über einen direkten RPC-Aufruf
-- (supabase.rpc('issue_invoice', ...)) eine beliebige Rechnung stellen, da
-- PostgreSQL EXECUTE auf neue Funktionen sonst standardmäßig an PUBLIC vergibt.
-- Ein interner Rollen-Check in der Funktion (get_my_role()) funktioniert hier
-- NICHT, da auth.uid() bei Aufrufen über den Service-Role-Key (unser eigener
-- Domain-Layer) NULL ist — das würde den legitimen Aufrufpfad mitblockieren.
revoke execute on function public.issue_invoice(uuid) from public, anon, authenticated;
grant execute on function public.issue_invoice(uuid) to service_role;

-- 27. create_credit_note() — zieht die GS-Nummer (Scope Jahr) und legt die
--     Gutschrift in EINER Transaktion an (gleiches Nummernkreis-Prinzip wie
--     issue_invoice — auch eine verbrannte GS-Nummer wäre ein GoBD-Verstoß).
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

-- 28. Unveränderlichkeit gestellter Rechnungen (GoBD). Solange der Entwurf
--     läuft (status = 'entwurf') ist alles erlaubt — inkl. des Übergangs
--     durch issue_invoice(). Danach sind nur noch erlaubt:
--       * pdf_url setzen/erneuern (Retry nach fehlgeschlagener PDF-Erzeugung)
--       * Statuswechsel versendet -> bezahlt (mit paid_at) oder -> storniert
--     Löschen ist ab dem Moment des Stellens grundsätzlich verboten.
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

drop trigger if exists invoices_immutability_trigger on public.invoices;
create trigger invoices_immutability_trigger
  before update or delete on public.invoices
  for each row execute function public.enforce_invoice_immutability();

-- 29. Unveränderlichkeit der Positionen gestellter Rechnungen — dieselbe
--     GoBD-Logik wie oben, aber am Elternstatus geprüft.
create or replace function public.enforce_invoice_items_immutability()
returns trigger
language plpgsql
as $$
declare
  v_invoice_id uuid;
  v_status     text;
begin
  v_invoice_id := coalesce(new.invoice_id, old.invoice_id);
  select status into v_status from public.invoices where id = v_invoice_id;

  if v_status is not null and v_status <> 'entwurf' then
    raise exception 'Positionen gestellter Rechnungen können nicht mehr geändert werden (GoBD).';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists invoice_items_immutability_trigger on public.invoice_items;
create trigger invoice_items_immutability_trigger
  before insert or update or delete on public.invoice_items
  for each row execute function public.enforce_invoice_items_immutability();

-- 30. STORAGE – Bucket 'invoices' (privat, ausschließlich Admin)
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

drop policy if exists "storage: Admin verwaltet Rechnungs-PDFs" on storage.objects;
create policy "storage: Admin verwaltet Rechnungs-PDFs"
  on storage.objects for all
  using (bucket_id = 'invoices' and public.get_my_role() = 'admin')
  with check (bucket_id = 'invoices' and public.get_my_role() = 'admin');
