import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { IMPERSONATION_COOKIE } from '@/lib/auth/impersonation'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const origin = new URL(request.url).origin
  const response = NextResponse.redirect(new URL('/login', origin), { status: 303 })
  // Läuft gerade eine Admin-Kundenansicht, darf der geparkte Admin-Refresh-Token nicht
  // überleben — sonst würde der nächste Portal-Besuch ein Banner ohne Session zeigen.
  response.cookies.delete(IMPERSONATION_COOKIE)
  return response
}
