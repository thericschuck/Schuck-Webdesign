'use client'

import { useActionState, useState, useId } from 'react'
import { setPassword } from './actions'

type State = { status: 'error'; message: string } | null

// ── Passwortstärke berechnen ──────────────────────────────────────────────────

type Strength = 'empty' | 'weak' | 'fair' | 'good' | 'strong'

function getStrength(pw: string): Strength {
  if (!pw) return 'empty'
  if (pw.length < 8) return 'weak'
  const hasLower = /[a-z]/.test(pw)
  const hasUpper = /[A-Z]/.test(pw)
  const hasDigit = /\d/.test(pw)
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw)
  const score = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length
  if (score <= 1) return 'fair'
  if (score === 2) return 'good'
  return 'strong'
}

const STRENGTH_META: Record<Strength, { label: string; color: string; bars: number }> = {
  empty:  { label: '',         color: 'bg-white/10',    bars: 0 },
  weak:   { label: 'Zu kurz', color: 'bg-red-500',     bars: 1 },
  fair:   { label: 'Schwach',  color: 'bg-amber-400',   bars: 2 },
  good:   { label: 'Gut',      color: 'bg-blue-400',    bars: 3 },
  strong: { label: 'Stark',    color: 'bg-green-400',   bars: 4 },
}

// ── Komponente ────────────────────────────────────────────────────────────────

export function SetPasswordForm({ email }: { email: string }) {
  const emailId   = useId()
  const pwId      = useId()
  const confirmId = useId()

  const [password, setPasswordValue]   = useState('')
  const [confirm, setConfirm]          = useState('')
  const [showPw, setShowPw]            = useState(false)
  const [showConfirm, setShowConfirm]  = useState(false)

  const strength = getStrength(password)
  const meta     = STRENGTH_META[strength]
  const matches  = confirm.length > 0 && password === confirm
  const mismatch = confirm.length > 0 && password !== confirm

  const [state, action, pending] = useActionState<State, FormData>(setPassword, null)

  return (
    <form action={action} className="flex flex-col gap-5">

      {/* E-Mail (read-only, vorausgefüllt) */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={emailId}
          className="text-white/50 text-sm"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          E-Mail-Adresse
        </label>
        <div className="relative">
          <input
            id={emailId}
            type="email"
            value={email}
            readOnly
            tabIndex={-1}
            className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/40 text-sm outline-none cursor-default select-none"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-white/20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </span>
        </div>
      </div>

      {/* Trennlinie */}
      <div className="border-t border-white/8 -mx-1" />

      {/* Passwort */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={pwId}
          className="text-white/60 text-sm"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Passwort wählen
        </label>
        <div className="relative">
          <input
            id={pwId}
            name="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            disabled={pending}
            placeholder="Min. 8 Zeichen"
            value={password}
            onChange={(e) => setPasswordValue(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white text-sm placeholder-white/20 outline-none focus:border-white/25 focus:bg-white/7 transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            {showPw ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* Stärke-Anzeige */}
        {password.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-0.5">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    bar <= meta.bars ? meta.color : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            <p
              className={`text-xs transition-colors ${
                strength === 'weak'   ? 'text-red-400' :
                strength === 'fair'   ? 'text-amber-400' :
                strength === 'good'   ? 'text-blue-400' :
                'text-green-400'
              }`}
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {meta.label}
              {strength === 'weak' && ' — Passwort muss mind. 8 Zeichen haben'}
              {strength === 'fair' && ' — Groß-/Kleinbuchstaben oder Zahlen ergänzen'}
            </p>
          </div>
        )}
      </div>

      {/* Passwort bestätigen */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={confirmId}
          className="text-white/60 text-sm"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Passwort bestätigen
        </label>
        <div className="relative">
          <input
            id={confirmId}
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            required
            disabled={pending}
            placeholder="Passwort wiederholen"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`w-full bg-white/5 border rounded-xl px-4 py-3 pr-11 text-white text-sm placeholder-white/20 outline-none transition-colors disabled:opacity-50 ${
              mismatch ? 'border-red-500/40 focus:border-red-500/60' :
              matches  ? 'border-green-500/40 focus:border-green-500/60' :
              'border-white/10 focus:border-white/25'
            }`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          />
          {/* Sichtbarkeit-Toggle */}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            {showConfirm ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
          {/* Match-Indicator */}
          {matches && (
            <span className="absolute right-9 top-1/2 -translate-y-1/2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
        </div>
        {mismatch && (
          <p className="text-xs text-red-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Passwörter stimmen nicht überein.
          </p>
        )}
      </div>

      {/* Server-Fehler */}
      {state?.status === 'error' && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {state.message}
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending || strength === 'weak' || mismatch}
        className="mt-1 w-full bg-white text-black text-sm font-semibold rounded-xl py-3.5 hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        {pending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Zugang wird eingerichtet…
          </span>
        ) : (
          'Zugang einrichten'
        )}
      </button>
    </form>
  )
}
