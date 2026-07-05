'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { resendClientInvite } from '@/lib/auth/invite-client'
import { deleteClient as deleteClientRecord } from '@/lib/domain/clients'
import { revalidatePath } from 'next/cache'

type DeleteResult = { status: 'error'; message: string } | { status: 'success' }
type ResendResult = { status: 'error'; message: string } | { status: 'success' }

export async function resendInvite(clientId: string): Promise<ResendResult> {
  await assertAdmin()

  const adminClient = createAdminClient()

  const { data: client } = await adminClient
    .from('clients')
    .select('profile_id, profiles(email)')
    .eq('id', clientId)
    .single()

  if (!client) return { status: 'error', message: 'Kunde nicht gefunden.' }

  const profileArr = Array.isArray(client.profiles) ? client.profiles : [client.profiles]
  const email = profileArr[0]?.email

  if (!email) return { status: 'error', message: 'Keine E-Mail-Adresse hinterlegt.' }

  try {
    await resendClientInvite(email)
  } catch (error) {
    console.error('[resendInvite] error:', error instanceof Error ? error.message : error)
    return { status: 'error', message: 'Einladung konnte nicht erneut gesendet werden.' }
  }

  await adminClient.from('clients').update({ invite_sent_at: new Date().toISOString() }).eq('id', clientId)

  revalidatePath(`/admin/clients/${clientId}`)
  return { status: 'success' }
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
