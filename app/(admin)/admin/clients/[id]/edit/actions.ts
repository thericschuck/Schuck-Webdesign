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

  try {
    await updateClientRecord(clientId, {
      company_name: str(companyName),
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
  if (clientRow?.profile_id && typeof fullName === 'string') {
    await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() || null })
      .eq('id', clientRow.profile_id)
  }

  redirect(`/admin/clients/${clientId}`)
}
