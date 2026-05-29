'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function AuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function handleCallback() {
      // ── PKCE Flow: ?code=... ──────────────────────────────────────────────
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          // Abgelaufener oder ungültiger Einladungslink → dedizierte Fehlerseite
          router.replace('/auth/set-password?expired=1')
          return
        }
      } else {
        // ── Implicit Flow: #access_token=... (Hash-Fragment) ─────────────
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (!accessToken || !refreshToken) {
          router.replace('/login?error=no_token')
          return
        }

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          router.replace('/auth/set-password?expired=1')
          return
        }
      }

      // ── Weiterleitung je nach Rolle ───────────────────────────────────────
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login?error=no_user')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') {
        router.replace('/admin/dashboard')
      } else {
        // Neuer Client → Passwort einrichten
        router.replace('/auth/set-password')
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <svg className="w-8 h-8 animate-spin text-white/30" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-white/40 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Zugang wird eingerichtet…
        </p>
      </div>
    </div>
  )
}
