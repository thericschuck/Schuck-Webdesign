-- ============================================================
-- 0045 – Tresor: Unterordner, Ordnerfarben, Tags
-- ============================================================
-- 1. vault_folders: `parent_id` erlaubt Verschachtelung (Unterordner), `color`
--    ist ein Farb-Token aus einer festen Palette (siehe lib/vault/colors.ts —
--    Freitext-Hex wollen wir hier bewusst nicht, sonst driftet die UI
--    auseinander). Löschen eines Elternordners reißt Unterordner NICHT mit
--    (parent_id -> null, sie werden top-level), analog zum bestehenden
--    Verhalten von vault_entries.folder_id.
--
-- 2. vault_tags + vault_entry_tags: von Ordnern unabhängige, mehrfach pro
--    Eintrag vergebbare Schlagworte mit eigener Farbe (n:m).

alter table public.vault_folders add column if not exists parent_id uuid references public.vault_folders(id) on delete set null;
alter table public.vault_folders add column if not exists color text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vault_folders_not_self_parent'
  ) then
    alter table public.vault_folders
      add constraint vault_folders_not_self_parent check (parent_id is distinct from id);
  end if;
end $$;

create index if not exists vault_folders_parent_id_idx on public.vault_folders(parent_id);

create table if not exists public.vault_tags (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text not null default 'gray',
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create unique index if not exists vault_tags_name_lower_idx on public.vault_tags (lower(name));

alter table public.vault_tags enable row level security;

create policy "vault_tags: Admin verwaltet alle"
  on public.vault_tags for all
  using (public.get_my_role() = 'admin');

create table if not exists public.vault_entry_tags (
  entry_id  uuid not null references public.vault_entries(id) on delete cascade,
  tag_id    uuid not null references public.vault_tags(id) on delete cascade,
  primary key (entry_id, tag_id)
);

create index if not exists vault_entry_tags_tag_id_idx on public.vault_entry_tags(tag_id);

alter table public.vault_entry_tags enable row level security;

create policy "vault_entry_tags: Admin verwaltet alle"
  on public.vault_entry_tags for all
  using (public.get_my_role() = 'admin');
