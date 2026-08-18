'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import {
  createCreditNoteAction,
  deleteTestInvoiceAction,
  issueInvoiceAction,
  regenerateInvoicePdfAction,
  updateInvoiceStatusAction,
} from './actions'
import type { InvoiceStatus } from '@/types/database'

type CreditState = { status: 'error'; message: string } | { status: 'success'; creditNoteNumber: string } | null

const primaryBtn =
  'px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors'
const secondaryBtn =
  'px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors'
const dangerLinkBtn = 'text-sm text-red-600 hover:text-red-700 font-medium transition-colors'

export function InvoiceActions({
  invoiceId,
  status,
  totalNet,
  isTest,
}: {
  invoiceId: string
  status: InvoiceStatus
  totalNet: number
  isTest?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [confirmStellen, setConfirmStellen] = useState(false)
  const [confirmStorno, setConfirmStorno] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showCreditForm, setShowCreditForm] = useState(false)
  const [issueError, setIssueError] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pdfSuccess, setPdfSuccess] = useState(false)

  const boundCreditAction = createCreditNoteAction.bind(null, invoiceId)
  const [creditState, creditAction, creditPending] = useActionState<CreditState, FormData>(boundCreditAction, null)

  useEffect(() => {
    if (creditState?.status === 'success') setShowCreditForm(false)
  }, [creditState])

  function handleIssue() {
    startTransition(async () => {
      const result = await issueInvoiceAction(invoiceId)
      if (result.status === 'error') {
        setIssueError(result.message)
      } else {
        setIssueError(null)
        setConfirmStellen(false)
      }
    })
  }

  function handleStatus(next: 'bezahlt' | 'storniert') {
    startTransition(async () => {
      const result = await updateInvoiceStatusAction(invoiceId, next)
      if (result.status === 'error') {
        setStatusError(result.message)
      } else {
        setStatusError(null)
        setConfirmStorno(false)
      }
    })
  }

  function handleRegeneratePdf() {
    startTransition(async () => {
      const result = await regenerateInvoicePdfAction(invoiceId)
      if (result.status === 'error') {
        setPdfError(result.message)
        setPdfSuccess(false)
      } else {
        setPdfError(null)
        setPdfSuccess(true)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTestInvoiceAction(invoiceId)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {status === 'entwurf' && (
        <a
          href={`/api/admin/finanzen/rechnungen/${invoiceId}/preview-pdf`}
          target="_blank"
          rel="noreferrer"
          className={secondaryBtn}
          style={{ fontFamily: 'var(--font-dm-sans)', textAlign: 'center' }}
        >
          PDF-Vorschau
        </a>
      )}

      {status === 'entwurf' &&
        (!confirmStellen ? (
          <button onClick={() => setConfirmStellen(true)} className={primaryBtn} style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Rechnung stellen
          </button>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col gap-3">
            <p className="text-sm text-gray-800 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Rechnung wirklich stellen?
            </p>
            <p className="text-xs text-gray-500 leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Vergibt eine fortlaufende Rechnungsnummer und erzeugt das PDF. Danach ist die Rechnung unveränderlich
              (GoBD) — nur noch Bezahlt/Storniert/Gutschrift sind möglich.
            </p>
            {issueError && (
              <p className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {issueError}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={handleIssue} disabled={isPending} className={`flex-1 ${primaryBtn}`} style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {isPending ? 'Wird gestellt…' : 'Ja, stellen'}
              </button>
              <button onClick={() => setConfirmStellen(false)} disabled={isPending} className={secondaryBtn} style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Abbrechen
              </button>
            </div>
          </div>
        ))}

      {status === 'versendet' && (
        <>
          <button
            onClick={() => handleStatus('bezahlt')}
            disabled={isPending}
            className={primaryBtn}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Als bezahlt markieren
          </button>

          {!confirmStorno ? (
            <button onClick={() => setConfirmStorno(true)} className={dangerLinkBtn} style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Stornieren
            </button>
          ) : (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-3">
              <p className="text-sm text-gray-800 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Rechnung wirklich stornieren?
              </p>
              {statusError && (
                <p className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {statusError}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatus('storniert')}
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  {isPending ? 'Wird storniert…' : 'Ja, stornieren'}
                </button>
                <button onClick={() => setConfirmStorno(false)} disabled={isPending} className={secondaryBtn} style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {(status === 'versendet' || status === 'bezahlt') &&
        (!showCreditForm ? (
          <button onClick={() => setShowCreditForm(true)} className={secondaryBtn} style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Gutschrift erstellen
          </button>
        ) : (
          <form action={creditAction} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Betrag (€) *
              </label>
              <input
                name="total_net"
                type="number"
                step="0.01"
                min={0.01}
                max={totalNet}
                required
                disabled={creditPending}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Grund
              </label>
              <textarea
                name="reason"
                rows={2}
                disabled={creditPending}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full resize-none"
              />
            </div>
            {creditState?.status === 'error' && (
              <p className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {creditState.message}
              </p>
            )}
            {creditState?.status === 'success' && (
              <p className="text-xs text-green-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Gutschrift {creditState.creditNoteNumber} erstellt.
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={creditPending} className={`flex-1 ${primaryBtn}`} style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {creditPending ? 'Wird erstellt…' : 'Gutschrift erstellen'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreditForm(false)}
                disabled={creditPending}
                className={secondaryBtn}
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                Abbrechen
              </button>
            </div>
          </form>
        ))}

      {status === 'storniert' && (
        <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Diese Rechnung ist storniert — keine weiteren Aktionen möglich.
        </p>
      )}

      {status !== 'entwurf' && (
        <div className="pt-1 border-t border-gray-100 flex flex-col gap-2">
          <button onClick={handleRegeneratePdf} disabled={isPending} className={secondaryBtn} style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {isPending ? 'Wird erzeugt…' : 'PDF neu erzeugen'}
          </button>
          {pdfError && (
            <p className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {pdfError}
            </p>
          )}
          {pdfSuccess && (
            <p className="text-xs text-green-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              PDF wurde neu erzeugt.
            </p>
          )}
        </div>
      )}

      {isTest &&
        (!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className={dangerLinkBtn} style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Testrechnung löschen
          </button>
        ) : (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-3">
            <p className="text-sm text-gray-800 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Testrechnung wirklich löschen?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {isPending ? 'Wird gelöscht…' : 'Ja, löschen'}
              </button>
              <button onClick={() => setConfirmDelete(false)} disabled={isPending} className={secondaryBtn} style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Abbrechen
              </button>
            </div>
          </div>
        ))}
    </div>
  )
}
