import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as notificationsDomain from '@/lib/domain/notifications'

/** Wird vom Browser aufgerufen, nachdem pushManager.subscribe() erfolgreich war. */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const endpoint = body?.endpoint
  const p256dh = body?.keys?.p256dh
  const auth = body?.keys?.auth
  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
    return NextResponse.json({ error: 'Ungültiges Push-Abo.' }, { status: 400 })
  }

  await notificationsDomain.savePushSubscription(user.id, { endpoint, p256dh, auth })
  await notificationsDomain.updatePreferences(user.id, { pushEnabled: true })

  return NextResponse.json({ status: 'ok' })
}
