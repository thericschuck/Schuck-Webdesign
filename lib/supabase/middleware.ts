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

  // ── Auth-Routen immer durchlassen (Callback, Set-Password) ────────────────
  if (pathname.startsWith('/auth/')) {
    return supabaseResponse
  }

  // ── Kein Login → geschützte Routen blockieren ─────────────────────────────

  if (!user) {
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/portal')
    ) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return supabaseResponse
  }

  // ── Eingeloggter User → Login-Seite überspringen ──────────────────────────

  if (pathname === '/login') {
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
      return NextResponse.redirect(new URL('/portal', request.url))
    }
  }

  // ── Role-Guard: /dashboard/* nur für Client ───────────────────────────────

  if (pathname.startsWith('/portal')) {
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
