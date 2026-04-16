'use client'

import { useActionState } from 'react'
import { signIn } from './actions'

type State = { status: 'error'; message: string } | null

export default function LoginPage() {
  const [state, action, pending] = useActionState<State, FormData>(signIn, null)

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-10">
          <h1
            className="text-3xl font-bold text-white"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Schuck Webdesign
          </h1>
          <p className="text-white/40 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Kundenportal & Backoffice
          </p>
        </div>

        <div className="bg-white/4 border border-white/10 rounded-2xl p-8">
          <h2
            className="text-white text-xl font-semibold mb-6"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Anmelden
          </h2>

          <form action={action} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-white/60 text-sm"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                E-Mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={pending}
                placeholder="deine@email.de"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 outline-none focus:border-white/30 focus:bg-white/[0.07] transition-colors disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-white/60 text-sm"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={pending}
                placeholder="••••••••"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 outline-none focus:border-white/30 focus:bg-white/[0.07] transition-colors disabled:opacity-50"
              />
            </div>

            {/* Error */}
            {state?.status === 'error' && (
              <p className="text-red-400 text-sm -mt-1">{state.message}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={pending}
              className="mt-1 w-full bg-white text-black text-sm font-semibold rounded-xl py-3 hover:bg-white/90 disabled:opacity-50 transition-colors"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {pending ? 'Anmelden…' : 'Anmelden'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/25 text-xs mt-6" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Nur für eingeladene Nutzer. Zugang über Schuck Webdesign.
        </p>
      </div>
    </main>
  )
}
