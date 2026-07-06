'use client'

import { useState, useTransition } from 'react'
import { generateOfferDocumentAction, sendOfferDocumentAction } from './actions'

export function OfferDocumentActions({
  leadId,
  offerId,
  clientId,
  clientEmail,
}: {
  leadId: string
  offerId: string
  clientId: string | null
  clientEmail: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [to, setTo] = useState(clientEmail ?? '')
  const [error, setError] = useState<string | null>(null)

  if (!clientId) {
    return (
      <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        Erst nach Umwandlung in Kunden verfügbar.
      </p>
    )
  }

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      const result = await generateOfferDocumentAction(leadId, clientId!, offerId)
      if (result.status === 'error') {
        setError(result.message)
      } else {
        setDocumentId(result.documentId)
        setSending(true)
      }
    })
  }

  function handleSend() {
    if (!documentId) return
    startTransition(async () => {
      const result = await sendOfferDocumentAction(leadId, documentId, to)
      if (result.status === 'error') {
        setError(result.message)
      } else {
        setSent(true)
        setSending(false)
      }
    })
  }

  if (sent) {
    return (
      <span className="text-xs text-green-600 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        PDF gesendet
      </span>
    )
  }

  if (sending) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            disabled={isPending}
            type="email"
            placeholder="Empfänger"
            className="text-xs rounded-lg border border-gray-200 px-2 py-1.5 outline-none focus:border-gray-400 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isPending || !to.trim()}
            className="text-xs text-white bg-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {isPending ? 'Sendet…' : 'Senden'}
          </button>
          <button
            onClick={() => setSending(false)}
            disabled={isPending}
            className="text-xs text-gray-400 hover:text-gray-700"
          >
            Abbrechen
          </button>
        </div>
        {error && (
          <span className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {error}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleGenerate}
        disabled={isPending}
        className="text-xs text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-40"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        {isPending ? 'Erzeugt PDF…' : 'Angebots-PDF erzeugen + senden'}
      </button>
      {error && (
        <span className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {error}
        </span>
      )}
    </div>
  )
}
