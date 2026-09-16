-- ============================================================
-- 0037 – Passwort-Tresor (vault_entries, vault_access_log)
-- ============================================================
-- Geteilter, verschlüsselter Zugangsdaten-Speicher für Admins (z.B. Eric +
-- Kollege). Das Passwort selbst wird NIE im Klartext in der DB abgelegt —
-- `secret_encrypted` enthält base64(iv || authTag || ciphertext), AES-256-GCM,
-- ver-/entschlüsselt ausschließlich server-seitig in lib/vault/encryption.ts
-- mit dem Server-Key VAULT_ENCRYPTION_KEY (nie im Client-Bundle, nie in der DB).
--
-- vault_access_log protokolliert jeden Zugriff (auch Anzeigen des Klartexts) –
-- bewusst OHNE Foreign Key auf vault_entries: ein gelöschter Eintrag soll die
-- Historie ("wer hat X wann eingesehen/gelöscht") nicht mitreißen. Stattdessen
-- trägt jede Zeile einen Titel-Snapshot.

create table if not exists public.vault_entries (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  username          text,
  url               text,
  category          text,
  notes             text,
  secret_encrypted  text not null,
  created_by        uuid references public.profiles(id) on delete set null,
  updated_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.vault_entries enable row level security;

create policy "vault_entries: Admin verwaltet alle"
  on public.vault_entries for all
  using (public.get_my_role() = 'admin');

create table if not exists public.vault_access_log (
  id           uuid primary key default gen_random_uuid(),
  entry_id     uuid not null,
  entry_title  text not null,
  accessed_by  uuid references public.profiles(id) on delete set null,
  action       text not null check (action in ('view', 'create', 'update', 'delete')),
  accessed_at  timestamptz not null default now()
);

create index if not exists vault_access_log_entry_id_idx on public.vault_access_log(entry_id, accessed_at desc);

alter table public.vault_access_log enable row level security;

create policy "vault_access_log: Admin verwaltet alle"
  on public.vault_access_log for all
  using (public.get_my_role() = 'admin');
