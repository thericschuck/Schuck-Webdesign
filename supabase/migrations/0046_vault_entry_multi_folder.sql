-- ============================================================
-- 0046 – Tresor: Ein Eintrag kann mehreren Ordnern zugeordnet sein
-- ============================================================
-- Bisher war vault_entries.folder_id eine 1:1-Zuordnung ("wohnt in genau einem
-- Ordner", wie eine Datei im Dateisystem). Praxisfall: ein .env-Eintrag soll
-- gleichzeitig unter "Projekte/Kunde X" UND unter ".env-Dateien" auffindbar
-- sein — also n:m, genau wie schon bei vault_entry_tags.
--
-- Bestehende folder_id-Werte werden 1:1 in die neue Zuordnungstabelle
-- übernommen, bevor die alte Spalte fällt — es geht dabei keine Zuordnung
-- verloren, sie wird nur von "Spalte" zu "Zeile in Join-Tabelle".

create table if not exists public.vault_entry_folders (
  entry_id  uuid not null references public.vault_entries(id) on delete cascade,
  folder_id uuid not null references public.vault_folders(id) on delete cascade,
  primary key (entry_id, folder_id)
);

create index if not exists vault_entry_folders_folder_id_idx on public.vault_entry_folders(folder_id);

alter table public.vault_entry_folders enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vault_entry_folders' and policyname = 'vault_entry_folders: Admin verwaltet alle'
  ) then
    create policy "vault_entry_folders: Admin verwaltet alle"
      on public.vault_entry_folders for all
      using (public.get_my_role() = 'admin');
  end if;
end $$;

insert into public.vault_entry_folders (entry_id, folder_id)
select id, folder_id from public.vault_entries where folder_id is not null
on conflict (entry_id, folder_id) do nothing;

alter table public.vault_entries drop column if exists folder_id;
