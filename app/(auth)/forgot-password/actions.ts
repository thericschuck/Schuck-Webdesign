'use server'

import { createClient } from '@/lib/supabase/server'
import { authCallbackUrl } from '@/lib/auth/site-url'

type ActionResult =
  | { status: 'error'; message: string }
  | { status: 'sent'; message: string }

export async function requestPasswordReset(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get('email')

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { status: 'error', message: 'Bitte eine gültige E-Mail eingeben.' }
  }

  // Bewusst der normale (anon) Client, nicht der Service-Role-Client: nur so greifen
  // die Rate-Limits von Supabase auf diesem öffentlichen Formular.
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: authCallbackUrl(),
  })

  if (error) {
    console.error('[forgot-password] resetPasswordForEmail:', error.message)
  }

  // Immer dieselbe Antwort — sonst verrät das Formular, welche Adressen registriert sind.
  return {
    status: 'sent',
    message: 'Falls für diese Adresse ein Zugang besteht, ist die E-Mail unterwegs. Der Link ist 24 Stunden gültig.',
  }
}
