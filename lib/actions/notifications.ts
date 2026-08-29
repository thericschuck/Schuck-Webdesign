'use server'

import { createClient } from '@/lib/supabase/server'
import * as notificationsDomain from '@/lib/domain/notifications'
import type { PushDevice } from '@/lib/domain/notifications'

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

/** Alle Geräte, auf denen dieser Account Push abonniert hat. */
export async function listPushDevices(): Promise<PushDevice[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  return notificationsDomain.listPushDevices(user.id)
}

/**
 * Entfernt ein Gerät aus der Ferne (z.B. altes Handy). Auf dem betroffenen Gerät bleibt
 * das Browser-Abo bestehen, es bekommt aber nichts mehr zugestellt — beim nächsten Öffnen
 * der Einstellungen zeigt der Schalter dort korrekt "aus", weil die Liste vom Server kommt.
 */
export async function removePushDevice(endpoint: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Nicht angemeldet.' }

  try {
    await notificationsDomain.deletePushSubscription(user.id, endpoint)
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Gerät konnte nicht entfernt werden.' }
  }

  return { status: 'success' }
}

/** Testbenachrichtigung an ein Gerät (oder an alle, wenn kein Endpoint übergeben wird). */
export async function sendTestNotification(endpoint?: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Nicht angemeldet.' }

  try {
    await notificationsDomain.sendTestPush(user.id, endpoint)
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Test fehlgeschlagen.' }
  }

  return { status: 'success' }
}
