'use server'

import { createClient } from '@/lib/supabase/server'

type ActionResult =
  | { status: 'success' }
  | { status: 'error'; message: string }

export async function signInWithEmail(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get('email')

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { status: 'error', message: 'Bitte eine gültige E-Mail eingeben.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      // Nur bereits eingeladene User erhalten einen Link.
      // Nicht-registrierte E-Mails werden stillschweigend ignoriert.
      shouldCreateUser: false,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    console.error('[login] signInWithOtp error:', error.message)
    // Aus Sicherheitsgründen keine Details nach außen geben
  }

  // Immer "Erfolg" anzeigen – so verraten wir nicht, ob eine E-Mail existiert
  return { status: 'success' }
}
