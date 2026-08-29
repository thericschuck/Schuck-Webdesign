import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deviceLabelFromUserAgent } from '@/lib/device-label'
import * as notificationsDomain from '@/lib/domain/notifications'

/**
 * Wird vom Browser aufgerufen, nachdem pushManager.subscribe() erfolgreich war.
 * Legt das Abo für GENAU DIESES Gerät an — bestehende Abos anderer Geräte bleiben
 * unberührt. Der Gerätename kommt aus dem User-Agent, damit die Einstellungen später
 * "Chrome auf Windows" statt einer 188 Zeichen langen Endpoint-URL anzeigen können.
 */
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

  await notificationsDomain.savePushSubscription(user.id, {
    endpoint,
    p256dh,
    auth,
    label: deviceLabelFromUserAgent(request.headers.get('user-agent')),
  })

  return NextResponse.json({ status: 'ok' })
}
