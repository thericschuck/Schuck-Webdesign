'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type InviteResult =
  | { status: 'success'; email: string }
  | { status: 'error'; message: string }

export async function inviteClient(
  _prev: InviteResult | null,
  formData: FormData
): Promise<InviteResult> {
  // Sicherstellen dass der aufrufende User wirklich Admin ist
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

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { status: 'error', message: 'Bitte eine gültige E-Mail eingeben.' }
  }

  // Service Role Client – darf Benutzer anlegen
  const adminClient = createAdminClient()

  const { data: invitedUser, error } = await adminClient.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    {
      data: {
        full_name: typeof name === 'string' ? name.trim() : '',
        role: 'client',
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    }
  )

  if (error) {
    console.error('[invite] inviteUserByEmail error:', error.message)

    if (error.message.includes('already been registered')) {
      return {
        status: 'error',
        message: 'Diese E-Mail ist bereits registriert.',
      }
    }

    return {
      status: 'error',
      message: 'Einladung fehlgeschlagen. Bitte versuche es erneut.',
    }
  }

  // Rolle in profiles auf 'client' setzen (der Trigger legt den Eintrag an)
  if (invitedUser.user) {
    await supabase
      .from('profiles')
      .update({ role: 'client', full_name: typeof name === 'string' ? name.trim() : null })
      .eq('id', invitedUser.user.id)
  }

  return { status: 'success', email: email.trim().toLowerCase() }
}
