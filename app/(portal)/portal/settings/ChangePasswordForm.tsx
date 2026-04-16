'use client'

import { useActionState, useState } from 'react'
import { changePassword } from './actions'

type State = { status: 'error'; message: string } | { status: 'success' } | null

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<State, FormData>(changePassword, null)
  const [showPw, setShowPw]           = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pw, setPw]                   = useState('')
  const [confirm, setConfirm]         = useState('')

  const mismatch = confirm.length > 0 && pw !== confirm
  const matches  = confirm.length > 0 && pw === confirm

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* Neues Passwort */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Neues Passwort
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            disabled={pending}
            placeholder="Min. 8 Zeichen"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <EyeIcon open={showPw} />
          </button>
        </div>
      </div>

      {/* Bestätigen */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
          Passwort bestätigen
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            required
            disabled={pending}
            placeholder="Passwort wiederholen"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`w-full rounded-xl border px-4 py-3 pr-11 text-sm text-gray-900 outline-none transition-colors disabled:opacity-50 ${
              mismatch ? 'border-red-400 focus:border-red-500' :
              matches  ? 'border-green-400 focus:border-green-500' :
                         'border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100'
            }`}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <EyeIcon open={showConfirm} />
          </button>
          {matches && (
            <span className="absolute right-9 top-1/2 -translate-y-1/2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
        </div>
        {mismatch && (
          <p className="text-xs text-red-500">Passwörter stimmen nicht überein.</p>
        )}
      </div>

      {/* Feedback */}
      {state?.status === 'error' && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
      {state?.status === 'success' && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Passwort erfolgreich geändert.
        </div>
      )}

      <button
        type="submit"
        disabled={pending || mismatch || pw.length < 8}
        className="w-full rounded-xl bg-gray-900 text-white text-sm font-semibold py-3 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? 'Wird gespeichert…' : 'Passwort ändern'}
      </button>
    </form>
  )
}
