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

  if (!user) {
    console.error('[set-password] Passwort gesetzt, aber kein User in der Session — Status bleibt pending.')
    redirect('/portal?onboarded=1')
  }

  // Admin-Client nötig – User hat keine RLS-Berechtigung seinen eigenen Status zu ändern
  const adminClient = createAdminClient()
  const { error: statusError } = await adminClient
    .from('clients')
    .update({ status: 'active' })
    .eq('profile_id', user.id)
    .eq('status', 'pending')

  // Nicht blockierend: der Zugang steht bereits. Aber ohne Log bliebe der Kunde im
  // Admin-Bereich stumm auf "Einladung offen" stehen, inkl. irreführendem Resend-Hinweis.
  if (statusError) {
    console.error('[set-password] Client-Status konnte nicht auf active gesetzt werden:', statusError.message)
  }

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') redirect('/admin/dashboard')

  redirect('/portal?onboarded=1')
}
