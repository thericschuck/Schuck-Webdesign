import { createAdminClient } from '@/lib/supabase/admin'
import { DomainError } from './errors'
import { encryptSecret, decryptSecret } from '@/lib/vault/encryption'

export type VaultEntryType = 'password' | 'env'

export interface VaultEntry {
  id: string
  title: string
  type: VaultEntryType
  username: string | null
  url: string | null
  folder_id: string | null
  folder_name: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by_name: string | null
  updated_by_name: string | null
}

interface RawVaultRow {
  id: string
  title: string
  type: VaultEntryType
  username: string | null
  url: string | null
  folder_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  folder: { name: string } | { name: string }[] | null
  creator: { full_name: string | null } | { full_name: string | null }[] | null
  updater: { full_name: string | null } | { full_name: string | null }[] | null
}

const VAULT_SELECT = `
  id, title, type, username, url, folder_id, notes, created_at, updated_at,
  folder:vault_folders(name),
  creator:profiles!vault_entries_created_by_fkey(full_name),
  updater:profiles!vault_entries_updated_by_fkey(full_name)
`

function firstOf<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function toVaultEntry(row: RawVaultRow): VaultEntry {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    username: row.username,
    url: row.url,
    folder_id: row.folder_id,
    folder_name: firstOf(row.folder)?.name ?? null,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by_name: firstOf(row.creator)?.full_name ?? null,
    updated_by_name: firstOf(row.updater)?.full_name ?? null,
  }
}

export async function listVaultEntries(): Promise<VaultEntry[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('vault_entries')
    .select(VAULT_SELECT)
    .order('title', { ascending: true })

  if (error) throw new DomainError(error.message)
  return (data as unknown as RawVaultRow[]).map(toVaultEntry)
}

// ── Ordner ────────────────────────────────────────────────────────────────

export interface VaultFolder {
  id: string
  name: string
}

export async function listVaultFolders(): Promise<VaultFolder[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.from('vault_folders').select('id, name').order('name', { ascending: true })
  if (error) throw new DomainError(error.message)
  return data ?? []
}

export async function createVaultFolder(name: string): Promise<VaultFolder> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.from('vault_folders').insert({ name }).select('id, name').single()
  if (error) {
    if (error.code === '23505') throw new DomainError('Ein Ordner mit diesem Namen existiert bereits.')
    throw new DomainError(error.message)
  }
  return data
}

export async function renameVaultFolder(id: string, name: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('vault_folders').update({ name }).eq('id', id)
  if (error) {
    if (error.code === '23505') throw new DomainError('Ein Ordner mit diesem Namen existiert bereits.')
    throw new DomainError(error.message)
  }
}

/** Einträge im Ordner werden NICHT gelöscht, sondern landen in "Nicht zugeordnet" (folder_id → null, siehe FK ON DELETE SET NULL). */
export async function deleteVaultFolder(id: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('vault_folders').delete().eq('id', id)
  if (error) throw new DomainError(error.message)
}

// ── Zugriffsprotokoll ────────────────────────────────────────────────────

export interface VaultAccessLogEntry {
  id: string
  action: 'view' | 'create' | 'update' | 'delete'
  accessed_at: string
  accessed_by_name: string | null
}

interface RawLogRow {
  id: string
  action: 'view' | 'create' | 'update' | 'delete'
  accessed_at: string
  accessor: { full_name: string | null } | { full_name: string | null }[] | null
}

export async function listVaultAccessLog(entryId: string, limit = 10): Promise<VaultAccessLogEntry[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('vault_access_log')
    .select('id, action, accessed_at, accessor:profiles(full_name)')
    .eq('entry_id', entryId)
    .order('accessed_at', { ascending: false })
    .limit(limit)

  if (error) throw new DomainError(error.message)
  return (data as unknown as RawLogRow[]).map((row) => ({
    id: row.id,
    action: row.action,
    accessed_at: row.accessed_at,
    accessed_by_name: firstOf(row.accessor)?.full_name ?? null,
  }))
}

// ── Einträge: Anlegen / Bearbeiten / Löschen ────────────────────────────

interface BaseEntryInput {
  title: string
  folderId?: string | null
  notes?: string | null
}

export type CreateVaultEntryInput = BaseEntryInput & { createdBy: string } & (
    | { type: 'password'; password: string; username?: string | null; url?: string | null }
    | { type: 'env'; variables: { key: string; value: string }[] }
  )

export async function createVaultEntry(input: CreateVaultEntryInput): Promise<void> {
  const adminClient = createAdminClient()
  const secret_encrypted =
    input.type === 'password' ? encryptSecret(input.password) : encryptSecret(JSON.stringify(input.variables))

  const { data, error } = await adminClient
    .from('vault_entries')
    .insert({
      title: input.title,
      type: input.type,
      username: input.type === 'password' ? (input.username ?? null) : null,
      url: input.type === 'password' ? (input.url ?? null) : null,
      folder_id: input.folderId ?? null,
      notes: input.notes ?? null,
      secret_encrypted,
      created_by: input.createdBy,
      updated_by: input.createdBy,
    })
    .select('id')
    .single()

  if (error) throw new DomainError(error.message)

  await logVaultAccess(data.id, input.title, input.createdBy, 'create')
}

export type UpdateVaultEntryInput = {
  title?: string
  folderId?: string | null
  notes?: string | null
  updatedBy: string
} & (
  | { type: 'password'; password?: string; username?: string | null; url?: string | null }
  | { type: 'env'; variables?: { key: string; value: string }[] }
)

export async function updateVaultEntry(id: string, input: UpdateVaultEntryInput): Promise<void> {
  const adminClient = createAdminClient()

  const patch: {
    updated_by: string
    updated_at: string
    title?: string
    username?: string | null
    url?: string | null
    folder_id?: string | null
    notes?: string | null
    secret_encrypted?: string
  } = {
    updated_by: input.updatedBy,
    updated_at: new Date().toISOString(),
  }
  if (input.title !== undefined) patch.title = input.title
  if (input.folderId !== undefined) patch.folder_id = input.folderId
  if (input.notes !== undefined) patch.notes = input.notes

  if (input.type === 'password') {
    if (input.username !== undefined) patch.username = input.username
    if (input.url !== undefined) patch.url = input.url
    if (input.password !== undefined) patch.secret_encrypted = encryptSecret(input.password)
  } else {
    if (input.variables !== undefined) patch.secret_encrypted = encryptSecret(JSON.stringify(input.variables))
  }

  const { data, error } = await adminClient.from('vault_entries').update(patch).eq('id', id).select('title').single()

  if (error) throw new DomainError(error.message)
  if (!data) throw new DomainError('Eintrag nicht gefunden.')

  await logVaultAccess(id, data.title, input.updatedBy, 'update')
}

export async function deleteVaultEntry(id: string, deletedBy: string): Promise<void> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.from('vault_entries').delete().eq('id', id).select('title').single()

  if (error) throw new DomainError(error.message)
  if (!data) throw new DomainError('Eintrag nicht gefunden.')

  await logVaultAccess(id, data.title, deletedBy, 'delete')
}

/** Gibt den entschlüsselten Rohwert zurück — bei type 'env' ein JSON-String, den der Aufrufer parst. */
export async function revealVaultSecret(id: string, accessedBy: string): Promise<string> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('vault_entries')
    .select('title, secret_encrypted')
    .eq('id', id)
    .single()

  if (error) throw new DomainError(error.message)
  if (!data) throw new DomainError('Eintrag nicht gefunden.')

  await logVaultAccess(id, data.title, accessedBy, 'view')
  return decryptSecret(data.secret_encrypted)
}

async function logVaultAccess(
  entryId: string,
  entryTitle: string,
  accessedBy: string,
  action: 'view' | 'create' | 'update' | 'delete'
): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('vault_access_log')
    .insert({ entry_id: entryId, entry_title: entryTitle, accessed_by: accessedBy, action })

  if (error) throw new DomainError(error.message)
}
