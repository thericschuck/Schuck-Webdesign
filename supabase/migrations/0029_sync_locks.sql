-- ============================================================
-- 0029 – Sync-Locks
-- ============================================================
-- Verhindert, dass zwei Läufe desselben Syncs gleichzeitig schreiben (z.B. nächtlicher
-- Cron und ein manueller Klick auf "Sheet synchronisieren" überlappen sich). Ein Insert
-- mit fixem Key dient als einfacher Advisory-Lock: schlägt er wegen des Primary Keys
-- fehl, läuft der Sync schon. `locked_at` erlaubt das Aufräumen hängender Locks nach
-- einem Absturz (siehe lib/domain/akquise-sync.ts).

create table if not exists public.sync_locks (
  key        text primary key,
  locked_at  timestamptz not null default now()
);

alter table public.sync_locks enable row level security;

create policy "sync_locks: Admin verwaltet alle"
  on public.sync_locks for all
  using (public.get_my_role() = 'admin');
