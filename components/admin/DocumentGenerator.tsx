'use client'

import { useState, useTransition } from 'react'

export type DocumentTemplateId = 'angebot' | 'vertrag' | 'briefing' | 'uebergabe'

const TEMPLATE_LABEL: Record<DocumentTemplateId, string> = {
  angebot: 'Angebot',
  vertrag: 'Vertrag',
  briefing: 'Briefing-Protokoll',
  uebergabe: 'Übergabe-Dokument',
}

export interface DocRow {
  id: string
  name: string
  created_at: string
}

export interface OfferOption {
  id: string
  /** null, solange das Angebot Entwurf ist — die AN-Nummer fällt erst beim Stellen. */
  offer_number: string | null
}

type GenerateResult = { status: 'error'; message: string } | { status: 'success'; documentId: string; name: string }
type SendResult = { status: 'error'; message: string } | { status: 'success' }

const inputClass =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full'

/**
 * Template auswählen → generieren → per E-Mail senden. Nimmt die eigentlichen
 * Server Actions als Props entgegen (statt sie fest zu importieren), damit
 * sowohl die Projekt- als auch die Kunden-Detailseite dieselbe UI mit ihren
 * jeweils eigenen revalidatePath-Zielen wiederverwenden können.
 */
export function DocumentGenerator({
  clientEmail,
  offers,
  documents,
  onGenerate,
  onSend,
}: {
  clientEmail: string | null
  offers: OfferOption[]
  documents: DocRow[]
  onGenerate: (template: DocumentTemplateId, offerId: string | null) => Promise<GenerateResult>
  onSend: (documentId: string, to: string, subject: string | null) => Promise<SendResult>
}) {
  const [isPending, startTransition] = useTransition()
  const [template, setTemplate] = useState<DocumentTemplateId>('vertrag')
  const [offerId, setOfferId] = useState('')
  const [genError, setGenError] = useState<string | null>(null)
  const [genSuccess, setGenSuccess] = useState<string | null>(null)

  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendTo, setSendTo] = useState('')
  const [sendSubject, setSendSubject] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  function handleGenerate() {
    setGenError(null)
    setGenSuccess(null)
    startTransition(async () => {
      const result = await onGenerate(template, template === 'angebot' ? offerId || null : null)
      if (result.status === 'error') {
        setGenError(result.message)
      } else {
        setGenSuccess(`"${result.name}" wurde erstellt.`)
      }
    })
  }

  function openSend(doc: DocRow) {
    setSendingId(doc.id)
    setSendTo(clientEmail ?? '')
    setSendSubject(`Dokument: ${doc.name}`)
    setSendError(null)
  }

  function handleSend() {
    if (!sendingId) return
    startTransition(async () => {
      const result = await onSend(sendingId, sendTo, sendSubject || null)
      if (result.status === 'error') {
        setSendError(result.message)
      } else {
        setSentIds((prev) => new Set(prev).add(sendingId))
        setSendingId(null)
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Generieren */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Dokument erstellen
        </h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Template
            </label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as DocumentTemplateId)}
              disabled={isPending}
              className={inputClass}
            >
              {(Object.keys(TEMPLATE_LABEL) as DocumentTemplateId[]).map((id) => (
                <option key={id} value={id}>
                  {TEMPLATE_LABEL[id]}
                </option>
              ))}
            </select>
          </div>
          {template === 'angebot' && (
            <div>
              <label className="text-xs text-gray-500 block mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Angebot
              </label>
              <select value={offerId} onChange={(e) => setOfferId(e.target.value)} disabled={isPending} className={inputClass}>
                <option value="">Angebot wählen…</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.offer_number ?? 'Entwurf (noch ohne Nummer)'}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={isPending || (template === 'angebot' && !offerId)}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {isPending ? 'Wird erzeugt…' : 'Generieren'}
          </button>
        </div>
        {template === 'angebot' && offers.length === 0 && (
          <p className="text-xs text-amber-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Für diesen Kunden existiert noch kein Angebot.
          </p>
        )}
        {genError && (
          <p className="text-sm text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {genError}
          </p>
        )}
        {genSuccess && (
          <p className="text-sm text-green-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {genSuccess}
          </p>
        )}
      </div>

      {/* Liste */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Erstellte Dokumente
        </h3>
        {documents.length === 0 ? (
          <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Noch keine Dokumente erstellt.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-3 py-2 rounded-xl border border-gray-100 bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {doc.name}
                  </p>
                  <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {new Date(doc.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {sentIds.has(doc.id) ? (
                  <span className="text-xs text-green-600 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    Gesendet
                  </span>
                ) : (
                  <button
                    onClick={() => openSend(doc)}
                    disabled={isPending}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-40"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    Senden
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Senden-Dialog */}
      {sendingId && (
        <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-800" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Dokument per E-Mail senden
          </p>
          <div>
            <label className="text-xs text-gray-500 block mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Empfänger *
            </label>
            <input
              value={sendTo}
              onChange={(e) => setSendTo(e.target.value)}
              disabled={isPending}
              type="email"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Betreff
            </label>
            <input value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} disabled={isPending} className={inputClass} />
          </div>
          {sendError && (
            <p className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {sendError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={isPending || !sendTo.trim()}
              className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {isPending ? 'Wird gesendet…' : 'Ja, senden'}
            </button>
            <button
              onClick={() => setSendingId(null)}
              disabled={isPending}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
