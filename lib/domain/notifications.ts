import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { DomainError } from './errors'

type SupabaseAdminClient = ReturnType<typeof createAdminClient>

let vapidConfigured = false

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false

  webpush.setVapidDetails('mailto:info@schuck-webdesign.de', publicKey, privateKey)
  vapidConfigured = true
  return true
}

export interface NotificationPreferences {
  pushEnabled: boolean
  emailEnabled: boolean
}

export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('notification_preferences')
    .select('push_enabled, email_enabled')
    .eq('user_id', userId)
    .maybeSingle()

  return {
    pushEnabled: data?.push_enabled ?? false,
    emailEnabled: data?.email_enabled ?? true,
  }
}

export async function updatePreferences(userId: string, patch: Partial<NotificationPreferences>): Promise<void> {
  const adminClient = createAdminClient()
  const updates: { user_id: string; updated_at: string; push_enabled?: boolean; email_enabled?: boolean } = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  }
  if (patch.pushEnabled !== undefined) updates.push_enabled = patch.pushEnabled
  if (patch.emailEnabled !== undefined) updates.email_enabled = patch.emailEnabled

  const { error } = await adminClient.from('notification_preferences').upsert(updates)
  if (error) throw new DomainError(error.message)
}

export interface PushSubscriptionInput {
  endpoint: string
  p256dh: string
  auth: string
  /** Lesbarer Gerätename, aus dem User-Agent der Anfrage abgeleitet. */
  label?: string | null
}

export interface PushDevice {
  endpoint: string
  label: string
  createdAt: string
  lastUsedAt: string | null
}

/**
 * Push ist konstruktionsbedingt PRO GERÄT: jeder Browser hat sein eigenes Abo. Der
 * globale Schalter `notification_preferences.push_enabled` darf deshalb nicht die
 * Wahrheit darüber sein, ob Push "an" ist — sonst zeigt ein zweites Gerät "an",
 * obwohl es dort nie ein Abo gab. Er wird hier stattdessen aus der Anzahl der Abos
 * abgeleitet und dient nur noch als Kill-Switch für `notifyUser()`.
 */
async function syncPushEnabled(adminClient: SupabaseAdminClient, userId: string): Promise<void> {
  const { count } = await adminClient
    .from('push_subscriptions')
    .select('endpoint', { count: 'exact', head: true })
    .eq('user_id', userId)

  await adminClient
    .from('notification_preferences')
    .upsert({ user_id: userId, push_enabled: (count ?? 0) > 0, updated_at: new Date().toISOString() })
}

export async function savePushSubscription(userId: string, sub: PushSubscriptionInput): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
        label: sub.label ?? null,
      },
      { onConflict: 'endpoint' }
    )
  if (error) throw new DomainError(error.message)
  await syncPushEnabled(adminClient, userId)
}

/** Löscht genau EIN Geräte-Abo — die anderen Geräte des Users bleiben aktiv. */
export async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
  const adminClient = createAdminClient()
  await adminClient.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', userId)
  await syncPushEnabled(adminClient, userId)
}

export async function listPushDevices(userId: string): Promise<PushDevice[]> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('push_subscriptions')
    .select('endpoint, label, created_at, last_used_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  return (data ?? []).map((row) => ({
    endpoint: row.endpoint,
    label: row.label ?? 'Unbekanntes Gerät',
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  }))
}

export type PushSendResult = { sent: number; failed: number; removed: number }

/**
 * Schickt eine Testbenachrichtigung — entweder an ein bestimmtes Gerät oder an alle.
 * Wirft (im Gegensatz zu notifyUser) bei Konfigurationsfehlern, damit man in den
 * Einstellungen eine echte Rückmeldung bekommt statt stiller Funkstille.
 */
export async function sendTestPush(userId: string, endpoint?: string): Promise<PushSendResult> {
  if (!ensureVapidConfigured()) {
    throw new DomainError('Push ist serverseitig nicht konfiguriert (VAPID-Schlüssel fehlen).')
  }

  const adminClient = createAdminClient()
  let query = adminClient.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId)
  if (endpoint) query = query.eq('endpoint', endpoint)
  const { data: subs } = await query

  if (!subs || subs.length === 0) {
    throw new DomainError('Für dieses Konto ist kein Gerät registriert.')
  }

  const result = await deliver(adminClient, subs, {
    title: 'Testbenachrichtigung',
    body: 'Wenn du das siehst, funktionieren Push-Benachrichtigungen auf diesem Gerät.',
    url: '/',
  })

  if (result.sent === 0) {
    throw new DomainError(
      result.removed > 0
        ? 'Das Abo dieses Geräts ist beim Push-Dienst abgelaufen und wurde entfernt. Bitte Push einmal aus- und wieder einschalten.'
        : 'Die Testbenachrichtigung konnte nicht zugestellt werden.'
    )
  }

  return result
}

/** Einziger Admin-Account des Systems (gleiches Muster wie lib/domain/documents.ts#getAdminProfileId). */
async function getAdminUserId(adminClient: SupabaseAdminClient): Promise<string | null> {
  const { data } = await adminClient.from('profiles').select('id').eq('role', 'admin').limit(1).maybeSingle()
  return data?.id ?? null
}

export interface NotifyInput {
  title: string
  body: string
  url?: string
}

type StoredSubscription = { endpoint: string; p256dh: string; auth: string }

/** Zustellung an eine Menge von Geräten — gemeinsame Basis von Benachrichtigung und Test. */
async function deliver(
  adminClient: SupabaseAdminClient,
  subs: StoredSubscription[],
  input: NotifyInput
): Promise<PushSendResult> {
  const payload = JSON.stringify({ title: input.title, body: input.body, url: input.url ?? '/' })
  let sent = 0
  let failed = 0
  let removed = 0

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
        sent++
        await adminClient
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('endpoint', sub.endpoint)
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          // Abo ist beim Push-Dienst nicht mehr gültig (z.B. Browser-Daten gelöscht) — aufräumen.
          await adminClient.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          removed++
        } else {
          failed++
          console.error('[notifications] Push fehlgeschlagen:', error instanceof Error ? error.message : error)
        }
      }
    })
  )

  return { sent, failed, removed }
}

async function sendPushToUser(adminClient: SupabaseAdminClient, userId: string, input: NotifyInput): Promise<void> {
  if (!ensureVapidConfigured()) {
    console.error('[notifications] VAPID-Schlüssel fehlen — Push wird nicht versendet.')
    return
  }

  const { data: subs } = await adminClient
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)
  if (!subs || subs.length === 0) return

  await deliver(adminClient, subs, input)
}

/**
 * Sendet Push (falls abonniert + aktiviert) und/oder E-Mail (falls aktiviert) an einen User,
 * je nach dessen notification_preferences. Wirft nie — ein Kanal, der fehlschlägt, darf den
 * aufrufenden Vorgang (Upload, Statuswechsel, Jarvis-Tool-Call) nicht scheitern lassen.
 */
export async function notifyUser(userId: string, input: NotifyInput): Promise<void> {
  try {
    const adminClient = createAdminClient()

    const [{ data: prefs }, { data: profile }] = await Promise.all([
      adminClient.from('notification_preferences').select('push_enabled, email_enabled').eq('user_id', userId).maybeSingle(),
      adminClient.from('profiles').select('email').eq('id', userId).single(),
    ])

    const pushEnabled = prefs?.push_enabled ?? false
    const emailEnabled = prefs?.email_enabled ?? true

    if (pushEnabled) await sendPushToUser(adminClient, userId, input)

    if (emailEnabled && profile?.email) {
      await sendEmail({
        to: profile.email,
        subject: input.title,
        html: `<p>${input.body}</p>${input.url ? `<p><a href="https://schuck-webdesign.de${input.url}">Ansehen</a></p>` : ''}`,
      })
    }
  } catch (error) {
    console.error('[notifications] notifyUser fehlgeschlagen:', error instanceof Error ? error.message : error)
  }
}

/** Benachrichtigt den (einzigen) Admin-Account — für JARVIS-Erinnerungen und Todo-Fälligkeiten. */
export async function notifyAdmin(input: NotifyInput): Promise<void> {
  const adminClient = createAdminClient()
  const adminId = await getAdminUserId(adminClient)
  if (!adminId) return
  await notifyUser(adminId, input)
}
