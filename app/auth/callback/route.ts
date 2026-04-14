import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Supabase leitet nach dem Magic-Link-Klick hierher.
 * Wir tauschen den Code gegen eine Session und leiten
 * anhand der Rolle auf den richtigen Bereich weiter.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(new URL('/login?error=invalid_code', origin))
  }

  // Session ist jetzt gesetzt – Rolle aus profiles lesen
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login?error=no_user', origin))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', origin))
  }

  return NextResponse.redirect(new URL('/dashboard', origin))
}
