'use client'

import { useState, useTransition } from 'react'
import { openClientView } from './actions'

/**
 * "Kundenansicht" — wechselt den Browser in die echte Portal-Session des Kunden.
 * Bei Erfolg redirected die Server Action selbst nach /portal, es kommt also nichts
 * zurück; nur im Fehlerfall gibt es eine Meldung.
 */
export function OpenClientViewButton({ clientId, disabled }: { clientId: string; disabled?: boolean }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await openClientView(clientId)
      if (result?.status === 'error') setError(result.message)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={pending || disabled}
        title={disabled ? 'Dieser Kunde hat keinen Portal-Zugang.' : 'Portal in der Session des Kunden öffnen'}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        {pending ? 'Öffne…' : 'Kundenansicht'}
      </button>
      {error && (
        <p className="text-xs text-red-600 max-w-64 text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
