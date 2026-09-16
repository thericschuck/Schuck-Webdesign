'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { DomainError } from '@/lib/domain/errors'
import {
  createVaultEntry,
  updateVaultEntry,
  deleteVaultEntry,
  revealVaultSecret,
  listVaultAccessLog,
  createVaultFolder,
  renameVaultFolder,
  deleteVaultFolder,
  type VaultAccessLogEntry,
  type VaultEntryType,
} from '@/lib/domain/vault'

type ActionResult = { status: 'error'; message: string } | { status: 'success' }

async function currentAdminId(): Promise<string> {
  const supabase = await assertAdmin()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new DomainError('Nicht angemeldet.')
  return user.id
}

/** var_key/var_value kommen als parallele, gleich benannte Felder in Dokumentreihenfolge aus dem Formular. */
function readVariables(formData: FormData): { key: string; value: string }[] {
  const keys = formData.getAll('var_key').map(String)
  const values = formData.getAll('var_value').map(String)
  return keys
    .map((key, i) => ({ key: key.trim(), value: values[i] ?? '' }))
    .filter((v) => v.key.length > 0)
}

export async function createVaultEntryAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const adminId = await currentAdminId()
    const title = String(formData.get('title') ?? '').trim()
    const type = (String(formData.get('type') ?? 'password') as VaultEntryType) === 'env' ? 'env' : 'password'
    const folderId = String(formData.get('folder_id') ?? '').trim() || null
    const notes = String(formData.get('notes') ?? '').trim() || null

    if (!title) return { status: 'error', message: 'Titel ist erforderlich.' }

    if (type === 'env') {
      const variables = readVariables(formData)
      if (variables.length === 0) return { status: 'error', message: 'Mindestens eine Variable ist erforderlich.' }
      await createVaultEntry({ type: 'env', title, variables, folderId, notes, createdBy: adminId })
    } else {
      const password = String(formData.get('password') ?? '')
      if (!password) return { status: 'error', message: 'Passwort ist erforderlich.' }
      await createVaultEntry({
        type: 'password',
        title,
        password,
        username: String(formData.get('username') ?? '').trim() || null,
        url: String(formData.get('url') ?? '').trim() || null,
        folderId,
        notes,
        createdBy: adminId,
      })
    }

    revalidatePath('/admin/vault')
    return { status: 'success' }
  } catch (err) {
    return { status: 'error', message: err instanceof DomainError ? err.message : 'Eintrag konnte nicht angelegt werden.' }
  }
}

export async function updateVaultEntryAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const adminId = await currentAdminId()
    const id = String(formData.get('id') ?? '')
    const title = String(formData.get('title') ?? '').trim()
    const type = (String(formData.get('type') ?? 'password') as VaultEntryType) === 'env' ? 'env' : 'password'
    const folderId = String(formData.get('folder_id') ?? '').trim() || null
    const notes = String(formData.get('notes') ?? '').trim() || null

    if (!id) return { status: 'error', message: 'Ungültiger Eintrag.' }
    if (!title) return { status: 'error', message: 'Titel ist erforderlich.' }

    if (type === 'env') {
      const variables = readVariables(formData)
      if (variables.length === 0) return { status: 'error', message: 'Mindestens eine Variable ist erforderlich.' }
      await updateVaultEntry(id, { type: 'env', title, variables, folderId, notes, updatedBy: adminId })
    } else {
      const password = String(formData.get('password') ?? '')
      await updateVaultEntry(id, {
        type: 'password',
        title,
        username: String(formData.get('username') ?? '').trim() || null,
        url: String(formData.get('url') ?? '').trim() || null,
        folderId,
        notes,
        // Leeres Passwort-Feld beim Bearbeiten heißt "unverändert lassen".
        password: password ? password : undefined,
        updatedBy: adminId,
      })
    }

    revalidatePath('/admin/vault')
    return { status: 'success' }
  } catch (err) {
    return { status: 'error', message: err instanceof DomainError ? err.message : 'Eintrag konnte nicht gespeichert werden.' }
  }
}

export async function deleteVaultEntryAction(id: string): Promise<ActionResult> {
  try {
    const adminId = await currentAdminId()
    await deleteVaultEntry(id, adminId)
    revalidatePath('/admin/vault')
    return { status: 'success' }
  } catch (err) {
    return { status: 'error', message: err instanceof DomainError ? err.message : 'Eintrag konnte nicht gelöscht werden.' }
  }
}

export async function revealVaultSecretAction(id: string): Promise<{ status: 'success'; secret: string } | { status: 'error'; message: string }> {
  try {
    const adminId = await currentAdminId()
    const secret = await revealVaultSecret(id, adminId)
    return { status: 'success', secret }
  } catch (err) {
    return { status: 'error', message: err instanceof DomainError ? err.message : 'Eintrag konnte nicht entschlüsselt werden.' }
  }
}

export async function loadVaultAccessLogAction(id: string): Promise<VaultAccessLogEntry[]> {
  await assertAdmin()
  return listVaultAccessLog(id)
}

export async function createVaultFolderAction(name: string): Promise<ActionResult> {
  try {
    await assertAdmin()
    const trimmed = name.trim()
    if (!trimmed) return { status: 'error', message: 'Name ist erforderlich.' }
    await createVaultFolder(trimmed)
    revalidatePath('/admin/vault')
    return { status: 'success' }
  } catch (err) {
    return { status: 'error', message: err instanceof DomainError ? err.message : 'Ordner konnte nicht angelegt werden.' }
  }
}

export async function renameVaultFolderAction(id: string, name: string): Promise<ActionResult> {
  try {
    await assertAdmin()
    const trimmed = name.trim()
    if (!trimmed) return { status: 'error', message: 'Name ist erforderlich.' }
    await renameVaultFolder(id, trimmed)
    revalidatePath('/admin/vault')
    return { status: 'success' }
  } catch (err) {
    return { status: 'error', message: err instanceof DomainError ? err.message : 'Ordner konnte nicht umbenannt werden.' }
  }
}

export async function deleteVaultFolderAction(id: string): Promise<ActionResult> {
  try {
    await assertAdmin()
    await deleteVaultFolder(id)
    revalidatePath('/admin/vault')
    return { status: 'success' }
  } catch (err) {
    return { status: 'error', message: err instanceof DomainError ? err.message : 'Ordner konnte nicht gelöscht werden.' }
  }
}
