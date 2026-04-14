import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Session auffrischen – WICHTIG: getUser() statt getSession()
  // getSession() liest nur den Cookie ohne Server-Validierung.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Kein Login → geschützte Routen blockieren ─────────────────────────────

  if (!user) {
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/dashboard')
    ) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return supabaseResponse
  }

  // ── Eingeloggter User → Login-Seite überspringen ──────────────────────────

  if (pathname === '/login') {
    // Auth-Callback hängt die Rolle in den redirect – hier einfach auf / leiten
    // (die Auth-Callback-Route macht den role-basierten redirect nach Login)
    return NextResponse.redirect(new URL('/', request.url))
  }

  // ── Role-Guard: /admin/* nur für Admin ────────────────────────────────────

  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      // Eingeloggter Client versucht Admin-Bereich zu öffnen
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // ── Role-Guard: /dashboard/* nur für Client ───────────────────────────────

  if (pathname.startsWith('/dashboard')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin') {
      // Admin landet im falschen Bereich
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  return supabaseResponse
}
