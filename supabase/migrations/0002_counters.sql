-- ============================================================
-- 0002 – Nummernkreise (counters) + get_next_number()
-- ============================================================

create table if not exists public.counters (
  typ         text not null,          -- 'KD' | 'PRJ' | ... (weitere Kreise folgen in späteren Phasen)
  scope_key   text not null default '', -- '' für globale Kreise (KD), Kundennummer für PRJ (z.B. 'KD-001')
  last_value  integer not null default 0,
  unique (typ, scope_key)
);

alter table public.counters enable row level security;

create policy "counters: Admin verwaltet alle"
  on public.counters for all
  using (public.get_my_role() = 'admin');

-- Zieht atomar die nächste Nummer für (p_typ, p_scope).
-- INSERT ... ON CONFLICT ... DO UPDATE sperrt die betroffene Zeile für die
-- Dauer der Transaktion, dadurch keine Race-Conditions bei parallelen Aufrufen.
create or replace function public.get_next_number(p_typ text, p_scope text default '')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  insert into public.counters (typ, scope_key, last_value)
  values (p_typ, p_scope, 1)
  on conflict (typ, scope_key)
  do update set last_value = public.counters.last_value + 1
  returning last_value into v_next;

  return v_next;
end;
$$;
