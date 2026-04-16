'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type InviteResult =
  | { status: 'success'; email: string; clientId: string }
  | { status: 'error'; message: string }

export async function inviteClient(
  _prev: InviteResult | null,
  formData: FormData
): Promise<InviteResult> {
  // Admin-Check
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

  // Formulardaten
  const email = formData.get('email')
  const name = formData.get('name')
  const companyName = formData.get('company_name')

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { status: 'error', message: 'Bitte eine gültige E-Mail eingeben.' }
  }
  if (!companyName || typeof companyName !== 'string' || companyName.trim().length < 2) {
    return { status: 'error', message: 'Bitte einen Firmennamen eingeben.' }
  }

  const cleanEmail = email.trim().toLowerCase()
  const cleanName = typeof name === 'string' ? name.trim() : ''
  const cleanCompany = companyName.trim()

  // User einladen (Service Role)
  const adminClient = createAdminClient()

  const { data: invitedUser, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    cleanEmail,
    {
      data: {
        full_name: cleanName,
        role: 'client',
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    }
  )

  if (inviteError) {
    console.error('[invite] inviteUserByEmail error:', inviteError.message)

    if (inviteError.message.includes('already been registered')) {
      return { status: 'error', message: 'Diese E-Mail ist bereits registriert.' }
    }

    return { status: 'error', message: 'Einladung fehlgeschlagen. Bitte versuche es erneut.' }
  }

  if (!invitedUser.user) {
    return { status: 'error', message: 'Kein User zurückgegeben. Bitte erneut versuchen.' }
  }

  const profileId = invitedUser.user.id

  // Profil anlegen oder aktualisieren (upsert – funktioniert auch ohne DB-Trigger)
  await adminClient
    .from('profiles')
    .upsert(
      { id: profileId, email: cleanEmail, role: 'client', full_name: cleanName || null },
      { onConflict: 'id' }
    )

  // clients-Row anlegen
  const { data: clientRow, error: clientError } = await adminClient
    .from('clients')
    .insert({
      profile_id: profileId,
      company_name: cleanCompany,
      status: 'pending',
    })
    .select('id')
    .single()

  if (clientError) {
    console.error('[invite] clients insert error:', clientError.message)
    return { status: 'error', message: 'Kunde angelegt, aber Firmendaten konnten nicht gespeichert werden.' }
  }

  return { status: 'success', email: cleanEmail, clientId: clientRow.id }
}
