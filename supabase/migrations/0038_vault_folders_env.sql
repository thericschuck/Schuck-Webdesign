-- ============================================================
-- 0038 – Tresor: Ordner + .env-Dateien als eigener Eintragstyp
-- ============================================================
-- Zwei Erweiterungen des Passwort-Tresors (0037):
--
--   1. Echte Ordner (vault_folders) statt freiem Text-Feld `category` — kein
--      Tippfehler-Wildwuchs mehr ("Hosting" vs. "hosting"), umbenennbar,
--      löschbar. Bestehende `category`-Werte werden 1:1 in Ordner überführt.
--
--   2. `vault_entries.type` unterscheidet 'password' (bisheriges Verhalten)
--      von 'env' — ein Satz Umgebungsvariablen (KEY=VALUE-Paare), als JSON
--      im selben `secret_encrypted`-Feld verschlüsselt. Kein Parallel-Schema
--      nötig: Verschlüsselung, RLS, Audit-Log (vault_access_log) gelten
--      unverändert für beide Typen.

create table if not exists public.vault_folders (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create unique index if not exists vault_folders_name_lower_idx on public.vault_folders (lower(name));

alter table public.vault_folders enable row level security;

create policy "vault_folders: Admin verwaltet alle"
  on public.vault_folders for all
  using (public.get_my_role() = 'admin');

alter table public.vault_entries add column if not exists folder_id uuid references public.vault_folders(id) on delete set null;
alter table public.vault_entries add column if not exists type text not null default 'password' check (type in ('password', 'env'));

-- Bestehende Kategorien 1:1 in Ordner überführen.
insert into public.vault_folders (name)
select distinct trim(category) from public.vault_entries
where category is not null and trim(category) <> ''
on conflict ((lower(name))) do nothing;

update public.vault_entries e
set folder_id = f.id
from public.vault_folders f
where e.category is not null
  and trim(e.category) <> ''
  and lower(trim(e.category)) = lower(f.name);

alter table public.vault_entries drop column if exists category;
