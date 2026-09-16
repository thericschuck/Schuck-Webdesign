'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * GoTrue hängt Fehler eines abgelaufenen/bereits benutzten Links sowohl an den
 * Query-String als auch an das Hash-Fragment (`?error=…#error=…`). Wird das nicht
 * gelesen, landet der Kunde stumm auf `/login` — ohne jeden Hinweis, warum.
 * Deshalb hier beide Quellen prüfen, bevor nach einem Token gesucht wird.
 */
function readAuthParams(search: URLSearchParams) {
  const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : ''
  const fromHash = new URLSearchParams(hash)
  const pick = (key: string) => search.get(key) ?? fromHash.get(key)

  return {
    error: pick('error') ?? pick('error_code'),
    errorDescription: pick('error_description'),
    /** 'invite' | 'recovery' | 'magiclink' | 'signup' — steuert die Wortwahl auf der Folgeseite. */
    type: pick('type'),
    code: search.get('code'),
    accessToken: fromHash.get('access_token'),
    refreshToken: fromHash.get('refresh_token'),
  }
}

export function AuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function handleCallback() {
      const params = readAuthParams(searchParams)
      // Recovery-Links führen immer zum Passwort-Formular — auch für Admins.
      const isRecovery = params.type === 'recovery'
      const expiredUrl = `/auth/set-password?expired=1${isRecovery ? '&mode=recovery' : ''}`

      // ── Abgelaufener / ungültiger Link ────────────────────────────────────
      if (params.error) {
        console.warn('[auth/callback] Link abgelehnt:', params.error, params.errorDescription ?? '')
        router.replace(expiredUrl)
        return
      }

      // ── PKCE Flow: ?code=... ──────────────────────────────────────────────
      if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code)
        if (error) {
          router.replace(expiredUrl)
          return
        }
      } else {
        // ── Implicit Flow: #access_token=... (Hash-Fragment) ─────────────
        if (!params.accessToken || !params.refreshToken) {
          // Kein Token und kein Fehler: typischerweise ein Fragment, das auf dem Weg
          // verloren ging (In-App-Browser). Für den Kunden ist das dasselbe Problem.
          router.replace(expiredUrl)
          return
        }

        const { error } = await supabase.auth.setSession({
          access_token: params.accessToken,
          refresh_token: params.refreshToken,
        })

        if (error) {
          router.replace(expiredUrl)
          return
        }
      }

      // ── Weiterleitung je nach Rolle ───────────────────────────────────────
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace(expiredUrl)
        return
      }

      if (isRecovery) {
        router.replace('/auth/set-password?mode=recovery')
        return
      }

      // Neue Einladung (Kunde oder Admin-Kollege) → immer erst Passwort einrichten.
      // Die Rolle entscheidet erst danach (in set-password/actions.ts) über das Ziel —
      // ein direkter Sprung zu /admin/dashboard hier würde den User einloggen, bevor
      // er ein Passwort hat, und ihn beim nächsten Login aussperren.
      router.replace('/auth/set-password')
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
