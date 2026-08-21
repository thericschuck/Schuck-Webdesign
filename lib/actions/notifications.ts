'use server'

import { createClient } from '@/lib/supabase/server'
import * as notificationsDomain from '@/lib/domain/notifications'

type ActionResult = { status: 'error'; message: string } | { status: 'success' }

/**
 * Von Admin- UND Portal-Einstellungen genutzt — jeder eingeloggte User verwaltet nur seine
 * eigene Zeile (durchgesetzt über RLS auf notification_preferences), daher kein assertAdmin().
 */
export async function setEmailPreference(enabled: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Nicht angemeldet.' }

  try {
    await notificationsDomain.updatePreferences(user.id, { emailEnabled: enabled })
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Fehler beim Speichern.' }
  }

  return { status: 'success' }
}
