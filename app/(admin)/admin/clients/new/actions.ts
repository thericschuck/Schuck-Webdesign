'use server'

import { assertAdmin } from '@/lib/auth/assert-admin'
import { inviteClientUser } from '@/lib/auth/invite-client'
import { createClient as createClientRecord } from '@/lib/domain/clients'

type InviteResult =
  | { status: 'success'; email: string; clientId: string }
  | { status: 'error'; message: string }

export async function inviteClient(
  _prev: InviteResult | null,
  formData: FormData
): Promise<InviteResult> {
  await assertAdmin()

  const email = formData.get('email')
  const name = formData.get('name')
  const companyName = formData.get('company_name')

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { status: 'error', message: 'Bitte eine gültige E-Mail eingeben.' }
  }
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return { status: 'error', message: 'Bitte einen Namen eingeben.' }
  }

  const cleanEmail = email.trim().toLowerCase()
  const cleanName = name.trim()
  const cleanCompany = typeof companyName === 'string' && companyName.trim() ? companyName.trim() : null

  try {
    const { profileId } = await inviteClientUser({ email: cleanEmail, fullName: cleanName })
    const client = await createClientRecord({ profileId, companyName: cleanCompany, status: 'pending' })
    return { status: 'success', email: cleanEmail, clientId: client.id }
  } catch (error) {
    console.error('[inviteClient] error:', error instanceof Error ? error.message : error)
    const message = error instanceof Error ? error.message : 'Einladung fehlgeschlagen. Bitte versuche es erneut.'
    return { status: 'error', message }
  }
}
