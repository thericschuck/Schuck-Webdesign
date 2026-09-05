'use client'

import { useState, useTransition } from 'react'
import { resendInvite } from './actions'

type Feedback = { status: 'error' | 'success'; message: string } | null

export function ResendInviteButton({ clientId }: { clientId: string }) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<Feedback>(null)

  function handleClick() {
    setFeedback(null)
    startTransition(async () => {
      const result = await resendInvite(clientId)
      setFeedback(result)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors self-start"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {pending ? 'Wird gesendet…' : 'Erneut einladen'}
      </button>

      {feedback && (
        <p
          className={`text-xs leading-relaxed ${feedback.status === 'success' ? 'text-green-700' : 'text-red-700'}`}
          style={{ fontFamily: 'var(--font-dm-sans)' }}
          role="status"
        >
          {feedback.message}
        </p>
      )}
    </div>
  )
}
