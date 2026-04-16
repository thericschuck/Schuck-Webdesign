'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type ActionResult = { status: 'error'; message: string }

export async function updateClient(
  clientId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return { status: 'error', message: 'Keine Berechtigung.' }
  }

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

  if (!companyName || typeof companyName !== 'string' || companyName.trim().length < 2) {
    return { status: 'error', message: 'Firmenname ist erforderlich.' }
  }

  const str = (v: FormDataEntryValue | null) =>
    typeof v === 'string' && v.trim() ? v.trim() : null

  // clients-Row holen für profile_id
  const { data: clientRow } = await supabase
    .from('clients')
    .select('profile_id')
    .eq('id', clientId)
    .single()

  const { error: clientError } = await supabase
    .from('clients')
    .update({
      company_name:    companyName.trim(),
      phone:           str(phone),
      website:         str(website),
      status:          status === 'inactive' ? 'inactive' : status === 'pending' ? 'pending' : 'active',
      address_street:  str(addressStreet),
      address_city:    str(addressCity),
      address_zip:     str(addressZip),
      address_country: str(addressCountry) ?? 'Deutschland',
      notes:           str(notes),
    })
    .eq('id', clientId)

  if (clientError) {
    return { status: 'error', message: 'Fehler beim Speichern.' }
  }

  // Profile-Name synchronisieren
  if (clientRow?.profile_id && typeof fullName === 'string') {
    await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() || null })
      .eq('id', clientRow.profile_id)
  }

  redirect(`/admin/clients/${clientId}`)
}
