'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DocumentEditor, type ClientOption, type ProjectOption } from '@/components/documents/DocumentEditor'
import type { ArticleOption, PackageOption } from '@/components/documents/PositionsEditor'
import type { DocumentEditorPayload, DocumentEditorState } from '@/components/documents/editor-types'
import {
  deleteOfferDraftAction,
  issueOfferAction,
  sendOfferAction,
  updateOfferDraftAction,
  updateOfferStatusAction,
} from '../actions'
import type { CompanySettings, OfferStatus } from '@/types/database'

const FONT = { fontFamily: 'var(--font-dm-sans)' } as const

const primaryBtn =
  'px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors'
const secondaryBtn =
  'px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors'

/**
 * Angebotsdetail: Editor plus die Aktionen, die vom Status abhängen.
 *
 * Entwurf → bearbeitbar, kann gestellt oder gelöscht werden.
 * Ab „gesendet" ist das Angebot festgeschrieben (Nummer vergeben); es lassen
 * sich nur noch Versand und Ausgang (angenommen/abgelehnt) protokollieren.
 */
export function OfferEditorShell({
  offerId,
  status,
  nummer,
  initialState,
  clients,
  projects,
  articles,
  packages,
  companySettings,
  standardEmail,
}: {
  offerId: string
  status: OfferStatus
  nummer: string | null
  initialState: DocumentEditorState
  clients: ClientOption[]
  projects: ProjectOption[]
  articles: ArticleOption[]
  packages: PackageOption[]
  companySettings: CompanySettings
  standardEmail: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [meldung, setMeldung] = useState<{ art: 'ok' | 'fehler'; text: string } | null>(null)
  const [versandOffen, setVersandOffen] = useState(false)
  const [email, setEmail] = useState(standardEmail ?? '')
  const [loeschBestaetigung, setLoeschBestaetigung] = useState(false)

  const istEntwurf = status === 'entwurf'

  async function speichern(payload: DocumentEditorPayload) {
    const result = await updateOfferDraftAction(offerId, payload)
    if (result.status === 'success') router.refresh()
    return result
  }

  function aktion(fn: () => Promise<{ status: 'error'; message: string } | { status: 'success'; id?: string }>, erfolg: string) {
    setMeldung(null)
    startTransition(async () => {
      const result = await fn()
      if (result.status === 'error') {
        setMeldung({ art: 'fehler', text: result.message })
      } else {
        setMeldung({ art: 'ok', text: erfolg })
        setVersandOffen(false)
        router.refresh()
      }
    })
  }

  return (
    <DocumentEditor
      kind="angebot"
      initialState={initialState}
      clients={clients}
      projects={projects}
      articles={articles}
      packages={packages}
      companySettings={companySettings}
      nummer={nummer}
      readOnly={!istEntwurf}
      saveLabel="Änderungen speichern"
      onSave={speichern}
      pdfUrl={`/api/admin/documents/pdf?typ=angebot&id=${offerId}`}
    >
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-900" style={FONT}>
          Aktionen
        </h2>

        {meldung && (
          <p
            className={`text-sm rounded-lg px-3 py-2 ${
              meldung.art === 'ok' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
            }`}
            style={FONT}
          >
            {meldung.text}
          </p>
        )}

        {istEntwurf ? (
          <>
            <p className="text-xs text-gray-400 leading-relaxed" style={FONT}>
              Beim Stellen wird die Angebotsnummer vergeben, die Empfängeranschrift eingefroren und das PDF
              erzeugt. Danach ist das Angebot nicht mehr bearbeitbar.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => aktion(() => issueOfferAction(offerId), 'Angebot gestellt.')}
                disabled={isPending}
                className={primaryBtn}
                style={FONT}
              >
                Angebot stellen
              </button>
              {loeschBestaetigung ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteOfferDraftAction(offerId)
                        if (result.status === 'error') setMeldung({ art: 'fehler', text: result.message })
                        else router.push('/admin/finanzen/angebote')
                      })
                    }
                    disabled={isPending}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                    style={FONT}
                  >
                    Wirklich löschen
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoeschBestaetigung(false)}
                    className={secondaryBtn}
                    style={FONT}
                  >
                    Abbrechen
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setLoeschBestaetigung(true)}
                  disabled={isPending}
                  className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                  style={FONT}
                >
                  Entwurf löschen
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {versandOffen ? (
                <>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="empfaenger@example.com"
                    className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 min-w-55"
                    style={FONT}
                  />
                  <button
                    type="button"
                    onClick={() => aktion(() => sendOfferAction(offerId, email), `Angebot an ${email} versendet.`)}
                    disabled={isPending}
                    className={primaryBtn}
                    style={FONT}
                  >
                    Senden
                  </button>
                  <button type="button" onClick={() => setVersandOffen(false)} className={secondaryBtn} style={FONT}>
                    Abbrechen
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setVersandOffen(true)}
                  disabled={isPending}
                  className={primaryBtn}
                  style={FONT}
                >
                  Per E-Mail senden
                </button>
              )}
            </div>

            {status === 'gesendet' && (
              <div className="flex items-center gap-2 flex-wrap border-t border-gray-100 pt-3">
                <span className="text-xs text-gray-400" style={FONT}>
                  Ausgang festhalten:
                </span>
                <button
                  type="button"
                  onClick={() => aktion(() => updateOfferStatusAction(offerId, 'angenommen'), 'Als angenommen markiert.')}
                  disabled={isPending}
                  className={secondaryBtn}
                  style={FONT}
                >
                  Angenommen
                </button>
                <button
                  type="button"
                  onClick={() => aktion(() => updateOfferStatusAction(offerId, 'abgelehnt'), 'Als abgelehnt markiert.')}
                  disabled={isPending}
                  className={secondaryBtn}
                  style={FONT}
                >
                  Abgelehnt
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </DocumentEditor>
  )
}
