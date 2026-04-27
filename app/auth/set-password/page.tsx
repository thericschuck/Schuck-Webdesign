import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SetPasswordForm } from './SetPasswordForm'

export default async function SetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Kein aktiver Session → abgelaufener/ungültiger Link
  if (!user) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-playfair)' }}>
            Link abgelaufen
          </h1>
          <p className="text-white/40 text-sm leading-relaxed mb-8" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Der Einladungslink ist nicht mehr gültig oder wurde bereits verwendet. Bitte wende dich an Schuck Webdesign.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-3 bg-white text-black text-sm font-semibold rounded-xl hover:bg-white/90 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Zur Anmeldung
          </Link>
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
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-10">
          <p className="text-white/30 text-xs tracking-widest uppercase mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Schuck Webdesign
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
            {firstName ? `Willkommen,\u00a0${firstName}.` : 'Willkommen.'}
          </h1>
          <p className="text-white/40 text-sm mt-3 max-w-xs mx-auto leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Richte deinen Zugang ein — damit kannst du dich ab jetzt jederzeit anmelden.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/3 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <SetPasswordForm email={user.email ?? ''} />
        </div>

        <p className="text-center text-white/20 text-xs mt-6" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Fragen? Melde dich bei thericschuck@gmail.com
        </p>
      </div>
    </main>
  )
}
