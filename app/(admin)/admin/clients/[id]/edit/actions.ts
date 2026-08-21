'use server'

import { assertAdmin } from '@/lib/auth/assert-admin'
import { updateClient as updateClientRecord, CLIENT_STATUS_VALUES } from '@/lib/domain/clients'
import { redirect } from 'next/navigation'
import type { ClientStatus } from '@/types/database'

type ActionResult = { status: 'error'; message: string }

export async function updateClient(
  clientId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await assertAdmin()

  const companyName    = formData.get('company_name')
  const phone          = formData.get('phone')
  const website        = formData.get('website')
  const status         = formData.get('status')
  const fullName       = formData.get('full_name')
  const firstName      = formData.get('first_name')
  const lastName       = formData.get('last_name')
  const email          = formData.get('email')
  const addressStreet  = formData.get('address_street')
  const addressCity    = formData.get('address_city')
  const addressZip     = formData.get('address_zip')
  const addressCountry = formData.get('address_country')
  const notes          = formData.get('notes')

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return { status: 'error', message: 'Name ist erforderlich.' }
  }

  const str = (v: FormDataEntryValue | null) =>
    typeof v === 'string' && v.trim() ? v.trim() : null

  // clients-Row holen für profile_id
  const { data: clientRow } = await supabase
    .from('clients')
    .select('profile_id')
    .eq('id', clientId)
    .single()

  const hasProfile = Boolean(clientRow?.profile_id)

  try {
    await updateClientRecord(clientId, {
      company_name: str(companyName),
      // Ohne Portal-Profil ist "Name"/E-Mail hier die Quelle (contact_name/contact_email).
      // Mit Profil bleibt profiles.full_name die einzige Namensquelle (siehe unten).
      contact_name: hasProfile ? undefined : fullName.trim(),
      first_name: str(firstName),
      last_name: str(lastName),
      contact_email: hasProfile ? undefined : str(email),
      phone: str(phone),
      website: str(website),
      status: CLIENT_STATUS_VALUES.includes(status as ClientStatus) ? (status as ClientStatus) : 'active',
      address_street: str(addressStreet),
      address_city: str(addressCity),
      address_zip: str(addressZip),
      address_country: str(addressCountry) ?? 'Deutschland',
      notes: str(notes),
    })
  } catch {
    return { status: 'error', message: 'Fehler beim Speichern.' }
  }

  // Profile-Name synchronisieren (eigene Tabelle, kein Teil der clients-Domain)
  if (hasProfile && clientRow?.profile_id && typeof fullName === 'string') {
    await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() || null })
      .eq('id', clientRow.profile_id)
  }

  redirect(`/admin/clients/${clientId}`)
}
