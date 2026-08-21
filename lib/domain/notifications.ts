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
}

export async function savePushSubscription(userId: string, sub: PushSubscriptionInput): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('push_subscriptions')
    .upsert(
      { user_id: userId, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      { onConflict: 'endpoint' }
    )
  if (error) throw new DomainError(error.message)
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const adminClient = createAdminClient()
  await adminClient.from('push_subscriptions').delete().eq('endpoint', endpoint)
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

async function sendPushToUser(adminClient: SupabaseAdminClient, userId: string, input: NotifyInput): Promise<void> {
  if (!ensureVapidConfigured()) return

  const { data: subs } = await adminClient
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)
  if (!subs || subs.length === 0) return

  const payload = JSON.stringify({ title: input.title, body: input.body, url: input.url ?? '/' })

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          // Abo ist beim Push-Dienst nicht mehr gültig (z.B. Browser-Daten gelöscht) — aufräumen.
          await adminClient.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        } else {
          console.error('[notifications] Push fehlgeschlagen:', error instanceof Error ? error.message : error)
        }
      }
    })
  )
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
