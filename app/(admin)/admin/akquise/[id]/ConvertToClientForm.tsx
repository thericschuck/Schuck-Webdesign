'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { convertLeadToClientAction } from './actions'

type State = { status: 'error'; message: string } | { status: 'success'; clientId: string } | null

const inputClass =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full'

export function ConvertToClientForm({
  leadId,
  firmenname,
  suggestedEmail,
}: {
  leadId: string
  firmenname: string
  suggestedEmail: string | null
}) {
  const router = useRouter()
  const boundAction = convertLeadToClientAction.bind(null, leadId)
  const [state, action, pending] = useActionState<State, FormData>(boundAction, null)
  const [email, setEmail] = useState(suggestedEmail ?? '')
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (state?.status === 'success') {
      router.push(`/admin/clients/${state.clientId}`)
    }
  }, [state, router])

  if (!showConfirm) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          E-Mail für Portal-Zugang
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="kunde@beispiel.de"
          className={inputClass}
        />
        <button
          type="button"
          disabled={!email}
          onClick={() => setShowConfirm(true)}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          In Kunde umwandeln
        </button>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
      <input type="hidden" name="email" value={email} />
      <p className="text-sm text-gray-800 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <strong>{firmenname}</strong> wirklich zu Kunde umwandeln?
      </p>
      <p className="text-xs text-gray-500 leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        Es wird sofort eine Portal-Einladungs-E-Mail an <strong>{email}</strong> versendet, eine neue KD-Nummer vergeben und der
        Lead auf „Gewonnen&rdquo; gesetzt.
      </p>
      {state?.status === 'error' && (
        <p className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {state.message}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {pending ? 'Wird umgewandelt…' : 'Ja, umwandeln + Einladung senden'}
        </button>
        <button
          type="button"
          onClick={() => setShowConfirm(false)}
          disabled={pending}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}
