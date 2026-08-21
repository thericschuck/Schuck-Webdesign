'use server'

import { assertAdmin } from '@/lib/auth/assert-admin'
import { inviteClientUser } from '@/lib/auth/invite-client'
import { createClient as createClientRecord } from '@/lib/domain/clients'

type CreateResult =
  | { status: 'success'; clientId: string; invited: boolean; email: string | null }
  | { status: 'error'; message: string }

export async function createClientAction(_prev: CreateResult | null, formData: FormData): Promise<CreateResult> {
  await assertAdmin()

  const name = formData.get('name')
  const firstName = formData.get('first_name')
  const lastName = formData.get('last_name')
  const email = formData.get('email')
  const companyName = formData.get('company_name')
  const phone = formData.get('phone')
  const website = formData.get('website')
  const sendInvite = formData.get('send_invite') === 'on'

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return { status: 'error', message: 'Bitte einen Namen eingeben.' }
  }

  const cleanName = name.trim()
  const cleanFirstName = typeof firstName === 'string' && firstName.trim() ? firstName.trim() : null
  const cleanLastName = typeof lastName === 'string' && lastName.trim() ? lastName.trim() : null
  const cleanEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null
  const cleanCompany = typeof companyName === 'string' && companyName.trim() ? companyName.trim() : null
  const cleanPhone = typeof phone === 'string' && phone.trim() ? phone.trim() : null
  const cleanWebsite = typeof website === 'string' && website.trim() ? website.trim() : null

  if (sendInvite && !cleanEmail) {
    return { status: 'error', message: 'Für die Portal-Einladung ist eine E-Mail-Adresse erforderlich.' }
  }

  try {
    let profileId: string | null = null
    if (sendInvite && cleanEmail) {
      ;({ profileId } = await inviteClientUser({ email: cleanEmail, fullName: cleanName }))
    }

    const client = await createClientRecord({
      profileId,
      contactName: cleanName,
      firstName: cleanFirstName,
      lastName: cleanLastName,
      contactEmail: cleanEmail,
      companyName: cleanCompany,
      phone: cleanPhone,
      website: cleanWebsite,
      status: 'pending',
    })

    return { status: 'success', clientId: client.id, invited: sendInvite, email: cleanEmail }
  } catch (error) {
    console.error('[createClientAction] error:', error instanceof Error ? error.message : error)
    const message = error instanceof Error ? error.message : 'Kunde konnte nicht angelegt werden.'
    return { status: 'error', message }
  }
}
