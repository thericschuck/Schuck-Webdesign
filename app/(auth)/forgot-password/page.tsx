'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from './actions'
import { ParticleCanvas } from '@/components/public/ParticleCanvas'

type State = { status: 'error'; message: string } | { status: 'sent'; message: string } | null

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<State, FormData>(requestPasswordReset, null)

  return (
    <main className="relative min-h-screen bg-[#080808] flex items-center justify-center px-6 overflow-hidden">
      <Link
        href="/login"
        className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-white/10 text-xs text-[#444] hover:text-[#F5F5F0] hover:border-white/20 transition-all duration-200"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Zur Anmeldung
      </Link>

      <ParticleCanvas />

      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(127,119,221,0.07) 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)' }}
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="flex items-baseline justify-center mb-1">
            <span style={{ fontFamily: 'Georgia, serif', fontWeight: 200, color: 'rgba(245,245,240,0.35)', fontSize: '22px' }}>[</span>
            <span style={{ fontFamily: 'var(--font-dm-sans)', fontWeight: 700, color: '#F5F5F0', fontSize: '20px', margin: '0 5px' }}>Schuck</span>
            <span style={{ fontFamily: 'Georgia, serif', fontWeight: 200, color: 'rgba(245,245,240,0.35)', fontSize: '22px' }}>]</span>
          </div>
          <p className="text-white/35 text-xs uppercase tracking-[0.2em] mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Kundenportal &amp; Backoffice
          </p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(3px) saturate(150%)',
            WebkitBackdropFilter: 'blur(24px) saturate(150%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#7F77DD] mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Passwort vergessen
          </p>
          <h2 className="text-white text-xl font-semibold mb-3" style={{ fontFamily: 'var(--font-fraunces)' }}>
            Link anfordern
          </h2>

          {state?.status === 'sent' ? (
            <div className="mt-5">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-white/50 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {state.message}
              </p>
            </div>
          ) : (
            <>
              <p className="text-white/35 text-sm leading-relaxed mb-6" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Wir schicken dir einen Link, mit dem du ein neues Passwort setzen kannst.
              </p>

              <form action={action} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-[10px] uppercase tracking-widest text-white/35" style={{ fontFamily: 'var(--font-dm-sans)' }}>
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
                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/20 outline-none focus:border-[#7F77DD]/50 focus:bg-white/8 transition-colors disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  />
                </div>

                {state?.status === 'error' && (
                  <p className="text-red-400/80 text-xs -mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>{state.message}</p>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="mt-1 w-full bg-[#F5F5F0] text-[#080808] text-sm font-semibold rounded-lg py-3 hover:bg-white disabled:opacity-50 transition-colors cursor-pointer"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  {pending ? 'Wird gesendet…' : 'Link senden'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Nur für eingeladene Nutzer. Zugang über Schuck Webdesign.
        </p>
      </div>
    </main>
  )
}
