'use server'

import { createClient } from '@/lib/supabase/server'

type ActionResult = { status: 'error'; message: string } | { status: 'success' }

export async function changePassword(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const password = formData.get('password')
  const confirm  = formData.get('confirmPassword')

  if (!password || typeof password !== 'string' || password.length < 8) {
    return { status: 'error', message: 'Passwort muss mindestens 8 Zeichen haben.' }
  }
  if (password !== confirm) {
    return { status: 'error', message: 'Passwörter stimmen nicht überein.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { status: 'error', message: 'Fehler beim Ändern des Passworts. Bitte erneut versuchen.' }
  }

  return { status: 'success' }
}
