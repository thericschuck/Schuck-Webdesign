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
  type VaultAccessLogEntry,
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

export async function createVaultEntryAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const adminId = await currentAdminId()
    const title = String(formData.get('title') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    if (!title) return { status: 'error', message: 'Titel ist erforderlich.' }
    if (!password) return { status: 'error', message: 'Passwort ist erforderlich.' }

    await createVaultEntry({
      title,
      password,
      username: String(formData.get('username') ?? '').trim() || null,
      url: String(formData.get('url') ?? '').trim() || null,
      category: String(formData.get('category') ?? '').trim() || null,
      notes: String(formData.get('notes') ?? '').trim() || null,
      createdBy: adminId,
    })

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
    const password = String(formData.get('password') ?? '')

    if (!id) return { status: 'error', message: 'Ungültiger Eintrag.' }
    if (!title) return { status: 'error', message: 'Titel ist erforderlich.' }

    await updateVaultEntry(id, {
      title,
      username: String(formData.get('username') ?? '').trim() || null,
      url: String(formData.get('url') ?? '').trim() || null,
      category: String(formData.get('category') ?? '').trim() || null,
      notes: String(formData.get('notes') ?? '').trim() || null,
      // Leeres Passwort-Feld beim Bearbeiten heißt "unverändert lassen".
      password: password ? password : undefined,
      updatedBy: adminId,
    })

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

export async function revealVaultSecretAction(id: string): Promise<{ status: 'success'; password: string } | { status: 'error'; message: string }> {
  try {
    const adminId = await currentAdminId()
    const password = await revealVaultSecret(id, adminId)
    return { status: 'success', password }
  } catch (err) {
    return { status: 'error', message: err instanceof DomainError ? err.message : 'Passwort konnte nicht entschlüsselt werden.' }
  }
}

export async function loadVaultAccessLogAction(id: string): Promise<VaultAccessLogEntry[]> {
  await assertAdmin()
  return listVaultAccessLog(id)
}
