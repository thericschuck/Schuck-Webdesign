import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SetPasswordForm } from './SetPasswordForm'
import { ParticleCanvas } from '@/components/public/ParticleCanvas'

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(3px) saturate(150%)',
  WebkitBackdropFilter: 'blur(24px) saturate(150%)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 4px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
}

function Background() {
  return (
    <>
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
    </>
  )
}

function BrandMark() {
  return (
    <div className="text-center mb-10">
      <div className="flex items-baseline justify-center mb-1">
        <span style={{ fontFamily: 'Georgia, serif', fontWeight: 200, color: 'rgba(245,245,240,0.35)', fontSize: '22px' }}>[</span>
        <span style={{ fontFamily: 'var(--font-dm-sans)', fontWeight: 700, color: '#F5F5F0', fontSize: '20px', margin: '0 5px' }}>Schuck</span>
        <span style={{ fontFamily: 'Georgia, serif', fontWeight: 200, color: 'rgba(245,245,240,0.35)', fontSize: '22px' }}>]</span>
      </div>
      <p className="text-white/35 text-xs uppercase tracking-[0.2em] mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        Kundenportal & Backoffice
      </p>
    </div>
  )
}

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { expired } = await searchParams

  // Kein aktiver Session oder explizit abgelaufen → Fehlerseite
  if (!user || expired === '1') {
    return (
      <main className="relative min-h-screen bg-[#080808] flex items-center justify-center px-6 overflow-hidden">
        <Background />
        <div className="relative z-10 w-full max-w-sm text-center">
          <BrandMark />
          <div className="rounded-2xl p-8" style={glassCard}>
            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
              Link abgelaufen
            </h1>
            <p className="text-white/40 text-sm leading-relaxed mb-6" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Dieser Einladungslink ist nicht mehr gültig — er wurde bereits verwendet oder ist abgelaufen.
              Bitte bitte Eric um einen neuen Einladungslink.
            </p>
            <div className="border-t border-white/8 pt-5 mb-6 flex flex-col gap-3 text-left">
              <a
                href="mailto:info@schuck-webdesign.de"
                className="flex items-center gap-3 text-sm text-white/50 hover:text-[#7F77DD] transition-colors"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                info@schuck-webdesign.de
              </a>
              <a
                href="tel:+4917634445821"
                className="flex items-center gap-3 text-sm text-white/50 hover:text-[#7F77DD] transition-colors"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +49 176 3444 5821
              </a>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full bg-white/8 text-white/60 text-sm font-medium rounded-lg py-2.5 hover:bg-white/12 transition-colors border border-white/10"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Zur Anmeldung
            </Link>
          </div>
          <p className="text-center text-white/20 text-xs mt-6" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Nur für eingeladene Nutzer. Zugang über Schuck Webdesign.
          </p>
        </div>
      </main>
    )
  }

  // Name aus Profil laden (falls vorhanden)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? null

  return (
    <main className="relative min-h-screen bg-[#080808] flex items-center justify-center px-6 py-12 overflow-hidden">
      <Background />

      <div className="relative z-10 w-full max-w-sm">
        <BrandMark />

        {/* Glass card */}
        <div className="rounded-2xl p-8" style={glassCard}>
          <p
            className="text-[11px] uppercase tracking-[0.14em] text-[#7F77DD] mb-1"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Einladung
          </p>
          <h2
            className="text-white text-xl font-semibold mb-7"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            {firstName ? `Willkommen, ${firstName}.` : 'Willkommen.'}
          </h2>
          <SetPasswordForm email={user.email ?? ''} />
        </div>

        <p className="text-center text-white/20 text-xs mt-6" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Nur für eingeladene Nutzer. Zugang über Schuck Webdesign.
        </p>
      </div>
    </main>
  )
}
