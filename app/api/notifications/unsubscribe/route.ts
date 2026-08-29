import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as notificationsDomain from '@/lib/domain/notifications'

/**
 * Meldet GENAU EIN Gerät ab. Vorher wurde hier zusätzlich `push_enabled` global auf
 * false gesetzt — damit hat das Abschalten auf dem Handy stillschweigend auch den
 * Laptop mit abgeschaltet. Der Schalter wird jetzt in der Domain aus der verbleibenden
 * Anzahl Abos abgeleitet.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const endpoint = body?.endpoint
  if (typeof endpoint !== 'string' || !endpoint) {
    return NextResponse.json({ error: 'Kein Endpoint angegeben.' }, { status: 400 })
  }

  await notificationsDomain.deletePushSubscription(user.id, endpoint)

  return NextResponse.json({ status: 'ok' })
}
