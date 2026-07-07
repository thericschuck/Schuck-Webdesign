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

  // Refresh the session from the server-validated user, not just the raw cookie.
  // Läuft bei JEDER Anfrage (auch öffentliche Seiten) — ein Netzwerk-Hänger/-Fehler beim
  // Supabase-Call darf die Anfrage nicht mit einem unbehandelten Fehler blockieren, sondern
  // degradiert auf "nicht angemeldet" (geschützte Routen greifen unten ohnehin ihren eigenen Redirect).
  let user = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch (error) {
    console.error('[middleware] supabase.auth.getUser() fehlgeschlagen:', error instanceof Error ? error.message : error)
  }

  const { pathname } = request.nextUrl

  if (pathname.startsWith('/auth/')) {
    return supabaseResponse
  }

  if (!user) {
    if (pathname.startsWith('/admin') || pathname.startsWith('/portal')) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return supabaseResponse
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const authenticatedHome =
    profile?.role === 'admin' ? '/admin/dashboard' : '/portal'

  if (pathname === '/login') {
    return NextResponse.redirect(new URL(authenticatedHome, request.url))
  }

  if (pathname.startsWith('/admin') && profile?.role !== 'admin') {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  if (pathname.startsWith('/portal') && profile?.role === 'admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  return supabaseResponse
}
