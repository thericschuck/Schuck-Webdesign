-- ============================================================
-- 0005 – Backfill: bestehende Kunden/Projekte nummerieren
-- ============================================================
-- Nummeriert in Anlagereihenfolge (created_at) über get_next_number(),
-- damit die vergebenen Nummern nahtlos an künftige JARVIS-Anlagen anschließen.

do $$
declare
  r record;
  v_seq integer;
begin
  for r in
    select id from public.clients
    where client_number is null
    order by created_at asc
  loop
    v_seq := public.get_next_number('KD', '');
    update public.clients
      set client_number = 'KD-' || lpad(v_seq::text, 3, '0')
      where id = r.id;
  end loop;
end $$;

do $$
declare
  r record;
  v_seq integer;
begin
  for r in
    select p.id, c.client_number
    from public.projects p
    join public.clients c on c.id = p.client_id
    where p.project_number is null
    order by p.created_at asc
  loop
    v_seq := public.get_next_number('PRJ', r.client_number);
    update public.projects
      set project_number = r.client_number || '-' || lpad(v_seq::text, 3, '0')
      where id = r.id;
  end loop;
end $$;
