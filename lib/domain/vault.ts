import { createAdminClient } from '@/lib/supabase/admin'
import { DomainError } from './errors'
import { encryptSecret, decryptSecret } from '@/lib/vault/encryption'

export type VaultEntryType = 'password' | 'env'

export interface VaultTag {
  id: string
  name: string
  color: string
}

export interface VaultEntryFolder {
  id: string
  name: string
  color: string | null
}

export interface VaultEntry {
  id: string
  title: string
  type: VaultEntryType
  username: string | null
  url: string | null
  folders: VaultEntryFolder[]
  tags: VaultTag[]
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
  notes: string | null
  created_at: string
  updated_at: string
  creator: { full_name: string | null } | { full_name: string | null }[] | null
  updater: { full_name: string | null } | { full_name: string | null }[] | null
  entry_tags: { tag: VaultTag | VaultTag[] | null }[] | null
  entry_folders: { folder: VaultEntryFolder | VaultEntryFolder[] | null }[] | null
}

const VAULT_SELECT = `
  id, title, type, username, url, notes, created_at, updated_at,
  creator:profiles!vault_entries_created_by_fkey(full_name),
  updater:profiles!vault_entries_updated_by_fkey(full_name),
  entry_tags:vault_entry_tags(tag:vault_tags(id, name, color)),
  entry_folders:vault_entry_folders(folder:vault_folders(id, name, color))
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
    folders: (row.entry_folders ?? []).map((ef) => firstOf(ef.folder)).filter((f): f is VaultEntryFolder => f !== null),
    tags: (row.entry_tags ?? []).map((et) => firstOf(et.tag)).filter((t): t is VaultTag => t !== null),
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

async function syncEntryTags(entryId: string, tagIds: string[]): Promise<void> {
  const adminClient = createAdminClient()
  const { error: deleteError } = await adminClient.from('vault_entry_tags').delete().eq('entry_id', entryId)
  if (deleteError) throw new DomainError(deleteError.message)
  if (tagIds.length === 0) return

  const { error: insertError } = await adminClient
    .from('vault_entry_tags')
    .insert(tagIds.map((tagId) => ({ entry_id: entryId, tag_id: tagId })))
  if (insertError) throw new DomainError(insertError.message)
}

async function syncEntryFolders(entryId: string, folderIds: string[]): Promise<void> {
  const adminClient = createAdminClient()
  const { error: deleteError } = await adminClient.from('vault_entry_folders').delete().eq('entry_id', entryId)
  if (deleteError) throw new DomainError(deleteError.message)
  if (folderIds.length === 0) return

  const { error: insertError } = await adminClient
    .from('vault_entry_folders')
    .insert(folderIds.map((folderId) => ({ entry_id: entryId, folder_id: folderId })))
  if (insertError) throw new DomainError(insertError.message)
}

// ── Ordner ────────────────────────────────────────────────────────────────

export interface VaultFolder {
  id: string
  name: string
  parent_id: string | null
  color: string | null
}

export async function listVaultFolders(): Promise<VaultFolder[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('vault_folders')
    .select('id, name, parent_id, color')
    .order('name', { ascending: true })
  if (error) throw new DomainError(error.message)
  return data ?? []
}

export async function createVaultFolder(
  name: string,
  opts: { parentId?: string | null; color?: string | null } = {}
): Promise<VaultFolder> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('vault_folders')
    .insert({ name, parent_id: opts.parentId ?? null, color: opts.color ?? null })
    .select('id, name, parent_id, color')
    .single()
  if (error) {
    if (error.code === '23505') throw new DomainError('Ein Ordner mit diesem Namen existiert bereits.')
    throw new DomainError(error.message)
  }
  return data
}

/** Prüft, ob `candidateParentId` ein Nachfahre von `folderId` ist (würde einen Zyklus erzeugen). */
async function isDescendant(folderId: string, candidateParentId: string): Promise<boolean> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.from('vault_folders').select('id, parent_id')
  if (error) throw new DomainError(error.message)

  const byId = new Map((data ?? []).map((f) => [f.id, f.parent_id as string | null]))
  let current: string | null = candidateParentId
  const seen = new Set<string>()
  while (current) {
    if (current === folderId) return true
    if (seen.has(current)) break
    seen.add(current)
    current = byId.get(current) ?? null
  }
  return false
}

export async function updateVaultFolder(
  id: string,
  patch: { name?: string; parentId?: string | null; color?: string | null }
): Promise<void> {
  const adminClient = createAdminClient()

  if (patch.parentId !== undefined && patch.parentId !== null) {
    if (patch.parentId === id) throw new DomainError('Ein Ordner kann nicht sein eigener Unterordner sein.')
    if (await isDescendant(id, patch.parentId)) {
      throw new DomainError('Ein Ordner kann nicht in einen seiner eigenen Unterordner verschoben werden.')
    }
  }

  const update: { name?: string; parent_id?: string | null; color?: string | null } = {}
  if (patch.name !== undefined) update.name = patch.name
  if (patch.parentId !== undefined) update.parent_id = patch.parentId
  if (patch.color !== undefined) update.color = patch.color

  const { error } = await adminClient.from('vault_folders').update(update).eq('id', id)
  if (error) {
    if (error.code === '23505') throw new DomainError('Ein Ordner mit diesem Namen existiert bereits.')
    throw new DomainError(error.message)
  }
}

/** Einträge und Unterordner werden NICHT gelöscht: Unterordner rutschen top-level
 * (parent_id → null, FK ON DELETE SET NULL), Einträge verlieren nur diese eine
 * Zuordnung (vault_entry_folders-Zeile fällt per ON DELETE CASCADE weg) — bleiben
 * aber erhalten, falls sie noch in anderen Ordnern liegen. */
export async function deleteVaultFolder(id: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('vault_folders').delete().eq('id', id)
  if (error) throw new DomainError(error.message)
}

// ── Tags ─────────────────────────────────────────────────────────────────

export async function listVaultTags(): Promise<VaultTag[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.from('vault_tags').select('id, name, color').order('name', { ascending: true })
  if (error) throw new DomainError(error.message)
  return data ?? []
}

export async function createVaultTag(name: string, color: string, createdBy: string): Promise<VaultTag> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('vault_tags')
    .insert({ name, color, created_by: createdBy })
    .select('id, name, color')
    .single()
  if (error) {
    if (error.code === '23505') throw new DomainError('Ein Tag mit diesem Namen existiert bereits.')
    throw new DomainError(error.message)
  }
  return data
}

export async function updateVaultTag(id: string, patch: { name?: string; color?: string }): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('vault_tags').update(patch).eq('id', id)
  if (error) {
    if (error.code === '23505') throw new DomainError('Ein Tag mit diesem Namen existiert bereits.')
    throw new DomainError(error.message)
  }
}

export async function deleteVaultTag(id: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('vault_tags').delete().eq('id', id)
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
  folderIds?: string[]
  notes?: string | null
  tagIds?: string[]
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
      notes: input.notes ?? null,
      secret_encrypted,
      created_by: input.createdBy,
      updated_by: input.createdBy,
    })
    .select('id')
    .single()

  if (error) throw new DomainError(error.message)

  if (input.folderIds && input.folderIds.length > 0) await syncEntryFolders(data.id, input.folderIds)
  if (input.tagIds && input.tagIds.length > 0) await syncEntryTags(data.id, input.tagIds)
  await logVaultAccess(data.id, input.title, input.createdBy, 'create')
}

export type UpdateVaultEntryInput = {
  title?: string
  folderIds?: string[]
  notes?: string | null
  tagIds?: string[]
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
    notes?: string | null
    secret_encrypted?: string
  } = {
    updated_by: input.updatedBy,
    updated_at: new Date().toISOString(),
  }
  if (input.title !== undefined) patch.title = input.title
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

  if (input.folderIds !== undefined) await syncEntryFolders(id, input.folderIds)
  if (input.tagIds !== undefined) await syncEntryTags(id, input.tagIds)
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
