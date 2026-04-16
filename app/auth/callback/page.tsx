import { Suspense } from 'react'
import { AuthCallbackHandler } from './AuthCallbackHandler'

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackSpinner />}>
      <AuthCallbackHandler />
    </Suspense>
  )
}

function CallbackSpinner() {
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
