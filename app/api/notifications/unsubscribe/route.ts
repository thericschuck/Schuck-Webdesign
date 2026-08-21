import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as notificationsDomain from '@/lib/domain/notifications'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const endpoint = body?.endpoint
  if (typeof endpoint === 'string' && endpoint) {
    await notificationsDomain.deletePushSubscription(endpoint)
  }
  await notificationsDomain.updatePreferences(user.id, { pushEnabled: false })

  return NextResponse.json({ status: 'ok' })
}
