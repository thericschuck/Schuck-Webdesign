'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

type ActionResult = { status: 'error'; message: string }

export async function setPassword(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const password = formData.get('password')
  const confirm = formData.get('confirmPassword')

  if (!password || typeof password !== 'string' || password.length < 8) {
    return { status: 'error', message: 'Passwort muss mindestens 8 Zeichen haben.' }
  }
  if (password !== confirm) {
    return { status: 'error', message: 'Passwörter stimmen nicht überein.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('[set-password] updateUser error:', error.message)
    return { status: 'error', message: 'Fehler beim Setzen des Passworts. Bitte versuche es erneut.' }
  }

  // Invite angenommen → Client-Status auf aktiv setzen
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Admin-Client nötig – User hat keine RLS-Berechtigung seinen eigenen Status zu ändern
    const adminClient = createAdminClient()
    await adminClient
      .from('clients')
      .update({ status: 'active' })
      .eq('profile_id', user.id)
      .eq('status', 'pending')
  }

  redirect('/portal?onboarded=1')
}
