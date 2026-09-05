'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { resendClientInvite, inviteClientUser } from '@/lib/auth/invite-client'
import { deleteClient as deleteClientRecord, attachClientProfile } from '@/lib/domain/clients'
import * as documentsDomain from '@/lib/domain/documents'
import type { DocumentTemplate } from '@/lib/domain/documents'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { beginImpersonation, type StartImpersonationResult } from '@/lib/auth/impersonation'

type DeleteResult = { status: 'error'; message: string } | { status: 'success' }
type ResendResult = { status: 'error'; message: string } | { status: 'success'; message: string }
type InviteExistingResult = { status: 'error'; message: string } | { status: 'success'; message: string }

/** Lädt einen bereits bestehenden, profillosen Kunden nachträglich zum Portal ein — Gegenstück zu resendInvite (dort existiert das Profil schon). */
export async function inviteExistingClient(
  clientId: string,
  _prev: InviteExistingResult | null,
  formData: FormData
): Promise<InviteExistingResult> {
  await assertAdmin()

  const email = String(formData.get('email') ?? '').trim()
  const fullName = String(formData.get('full_name') ?? '').trim()
  if (!email || !email.includes('@')) return { status: 'error', message: 'Bitte eine gültige E-Mail eingeben.' }

  try {
    const { profileId } = await inviteClientUser({ email, fullName })
    await attachClientProfile(clientId, profileId)
  } catch (error) {
    console.error('[inviteExistingClient] error:', error instanceof Error ? error.message : error)
    return { status: 'error', message: error instanceof Error ? error.message : 'Einladung fehlgeschlagen.' }
  }

  revalidatePath(`/admin/clients/${clientId}`)
  return { status: 'success', message: `Einladung an ${email} verschickt.` }
}

export async function resendInvite(clientId: string): Promise<ResendResult> {
  await assertAdmin()

  const adminClient = createAdminClient()

  const { data: client } = await adminClient
    .from('clients')
    .select('profile_id, contact_email, profiles(email)')
    .eq('id', clientId)
    .single()

  if (!client) return { status: 'error', message: 'Kunde nicht gefunden.' }

  const profileArr = Array.isArray(client.profiles) ? client.profiles : [client.profiles]
  // Der Link muss an die Adresse des auth-Users gehen — eine andere Adresse würde
  // einen zweiten Account anlegen statt den bestehenden einzuladen. contact_email
  // dient nur als Fallback für Kunden ohne verknüpftes Profil.
  const email = profileArr[0]?.email ?? client.contact_email

  if (!email) return { status: 'error', message: 'Keine E-Mail-Adresse hinterlegt.' }

  let kind: 'invite' | 'recovery'
  try {
    kind = await resendClientInvite(email)
  } catch (error) {
    console.error('[resendInvite] error:', error instanceof Error ? error.message : error)
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Einladung konnte nicht erneut gesendet werden.',
    }
  }

  await adminClient.from('clients').update({ invite_sent_at: new Date().toISOString() }).eq('id', clientId)

  revalidatePath(`/admin/clients/${clientId}`)
  return {
    status: 'success',
    message:
      kind === 'invite'
        ? `Neue Einladung an ${email} verschickt.`
        : `${email} hat bereits einen Zugang — stattdessen wurde ein Link zum Passwort-Zurücksetzen verschickt.`,
  }
}

export async function deleteClient(clientId: string): Promise<DeleteResult> {
  await assertAdmin()

  try {
    await deleteClientRecord(clientId)
    return { status: 'success' }
  } catch (error) {
    console.error('[deleteClient] error:', error instanceof Error ? error.message : error)
    const message = error instanceof Error ? error.message : 'Fehler beim Löschen des Kunden.'
    return { status: 'error', message }
  }
}

// ── Dokumente erstellen/senden ───────────────────────────────────────────────

type GenerateDocumentResult =
  | { status: 'error'; message: string }
  | { status: 'success'; documentId: string; name: string }

export async function generateClientDocumentAction(
  clientId: string,
  template: DocumentTemplate,
  offerId: string | null
): Promise<GenerateDocumentResult> {
  await assertAdmin()

  try {
    const doc = await documentsDomain.generateDocument({ template, clientId, offerId })
    revalidatePath(`/admin/clients/${clientId}`)
    return { status: 'success', documentId: doc.id, name: doc.name }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Dokument konnte nicht erstellt werden.' }
  }
}

type SendDocumentResult = { status: 'error'; message: string } | { status: 'success' }

export async function sendClientDocumentAction(
  clientId: string,
  documentId: string,
  to: string,
  subject: string | null
): Promise<SendDocumentResult> {
  await assertAdmin()

  try {
    await documentsDomain.sendDocument({ documentId, to, subject: subject ?? undefined })
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Dokument konnte nicht gesendet werden.' }
  }

  revalidatePath(`/admin/clients/${clientId}`)
  return { status: 'success' }
}

/** Öffnet das Kundenportal in der echten Session des Kunden — siehe lib/auth/impersonation.ts. */
export async function openClientView(clientId: string): Promise<StartImpersonationResult> {
  await assertAdmin()

  const result = await beginImpersonation(clientId)
  if (result.status === 'error') return result

  redirect('/portal')
}
