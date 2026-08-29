-- ============================================================
-- 0035 – Ordner als eigene Entität
-- ============================================================
-- Bisher existierte ein "Ordner" nur implizit als String in documents.folder. Folgen:
--   * Leere Ordner waren nicht speicherbar ("Neuer Ordner" erzwang sofort einen Upload).
--   * Das Verschieben-Dropdown konnte nur Ordner anbieten, die bereits eine Datei
--     enthielten — bei einem Kunden mit genau einer Datei stand dort ausschließlich
--     "Kein Ordner", jedes Verschieben schrieb folder = null (No-Op).
--   * Die letzte Datei aus einem Ordner zu verschieben löschte den Ordner.
--   * Umbenennen/Löschen von Ordnern war nicht möglich.
--
-- public.folders macht den Ordner zur eigenständigen Zeile. `path` ist der volle Pfad
-- ("Verträge" bzw. "Verträge/2024"); jeder Zwischenpfad ist eine eigene Zeile, damit die
-- Navigation Ordner ohne direkten Inhalt anzeigen kann.
--
-- project_id ist NULL-bar: Ordner (und Dokumente) dürfen kundenweit statt an einem
-- Projekt hängen — das ist die "Alle Projekte"-Ebene im Explorer.

create table if not exists public.folders (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients(id)  on delete cascade,
  project_id uuid          references public.projects(id) on delete cascade,
  path       text not null check (
                path <> ''
                and path not like '/%'
                and path not like '%/'
                and path not like '%//%'
              ),
  created_by uuid          references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- NULLS NOT DISTINCT (PG15+): behandelt project_id = NULL als vergleichbaren Wert,
-- sonst wären beliebig viele identische kundenweite Ordner möglich.
create unique index if not exists folders_scope_path_unique
  on public.folders (client_id, project_id, path) nulls not distinct;

create index if not exists folders_client_idx  on public.folders (client_id);
create index if not exists folders_project_idx on public.folders (project_id);

alter table public.folders enable row level security;

-- Client sieht nur Ordner seines eigenen clients-Eintrags (gleiche Logik wie
-- "documents: Client sieht eigene Dokumente").
drop policy if exists "folders: Client sieht eigene Ordner" on public.folders;
create policy "folders: Client sieht eigene Ordner"
  on public.folders for select
  using (
    exists (
      select 1 from public.clients c
      where c.id = folders.client_id
        and c.profile_id = auth.uid()
    )
    or public.get_my_role() = 'admin'
  );

drop policy if exists "folders: Admin verwaltet alle" on public.folders;
create policy "folders: Admin verwaltet alle"
  on public.folders for all
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- Kunden dürfen im Portal eigene Ordner anlegen, umbenennen und löschen. Anders als bei
-- documents gibt es hier keine uploaded_by-Einschränkung: ein Ordner trägt keine Inhalte,
-- und welche Dokumente beim Umbenennen mitwandern, entscheidet weiterhin die
-- documents-UPDATE-Policy (nur eigene Uploads, siehe 0020).
drop policy if exists "folders: Client legt eigene Ordner an" on public.folders;
create policy "folders: Client legt eigene Ordner an"
  on public.folders for insert
  with check (
    (select profile_id from public.clients where id = folders.client_id) = auth.uid()
  );

drop policy if exists "folders: Client bearbeitet eigene Ordner" on public.folders;
create policy "folders: Client bearbeitet eigene Ordner"
  on public.folders for update
  using (
    (select profile_id from public.clients where id = folders.client_id) = auth.uid()
  )
  with check (
    (select profile_id from public.clients where id = folders.client_id) = auth.uid()
  );

drop policy if exists "folders: Client löscht eigene Ordner" on public.folders;
create policy "folders: Client löscht eigene Ordner"
  on public.folders for delete
  using (
    (select profile_id from public.clients where id = folders.client_id) = auth.uid()
  );

-- ── Backfill ────────────────────────────────────────────────
-- Jeden in documents.folder vorkommenden Pfad samt aller Elternpfade anlegen:
-- "Verträge/2024" erzeugt "Verträge" und "Verträge/2024".

insert into public.folders (client_id, project_id, path)
select distinct d.client_id, d.project_id, sub.path
from public.documents d
cross join lateral (
  select array_to_string((string_to_array(d.folder, '/'))[1:i], '/') as path
  from generate_subscripts(string_to_array(d.folder, '/'), 1) as i
) sub
where d.folder is not null
  and sub.path <> ''
on conflict do nothing;
