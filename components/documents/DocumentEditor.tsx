'use client'

import { useState, useTransition } from 'react'
import { DocumentPreview } from './DocumentPreview'
import { PositionsEditor, type ArticleOption, type PackageOption } from './PositionsEditor'
import {
  LEERE_POSITION,
  LEERER_EMPFAENGER,
  summe,
  toPayload,
  type DocumentEditorState,
  type DocumentKind,
  type PositionDraft,
  type SaveResult,
} from './editor-types'
import { documentFromInvoice, documentFromOffer, type ItemLike } from '@/lib/documents/from-db'
import { DEFAULT_THEME } from '@/lib/documents/theme'
import type { CompanySettings } from '@/types/database'

/**
 * Split-Screen-Editor für Rechnung und Angebot.
 *
 * Links die Konfiguration, rechts eine seitengenaue Live-Vorschau desselben
 * Dokuments, das später als PDF herauskommt — beide Seiten benutzen
 * `renderDocument()` aus `lib/documents/`. Es gibt keinen Server-Roundtrip für
 * die Vorschau: das HTML entsteht im Browser, die Aktualisierung ist sofort.
 *
 * Der Empfänger kommt wahlweise aus dem Kundenstamm oder wird frei eingetippt
 * (Migration 0036) — für einmalige Rechnungen/Angebote, für die kein
 * Kundendatensatz angelegt werden soll.
 */

const FONT = { fontFamily: 'var(--font-dm-sans)' } as const

const inputClass =
  'rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full'

export interface ClientOption {
  id: string
  display_name: string
  client_number: string | null
  company_name: string | null
  contact_name: string | null
  full_name: string | null
  address_street: string | null
  address_zip: string | null
  address_city: string | null
  address_country: string | null
}

export interface ProjectOption {
  id: string
  title: string
  client_id: string
}

function Feld({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500" style={FONT}>
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-[11px] text-gray-400" style={FONT}>
          {hint}
        </span>
      )}
    </label>
  )
}

function Karte({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-900" style={FONT}>
        {titel}
      </h2>
      {children}
    </section>
  )
}

export function DocumentEditor({
  kind,
  initialState,
  clients,
  projects,
  articles,
  packages,
  companySettings,
  nummer,
  readOnly = false,
  saveLabel,
  onSave,
  pdfUrl,
  children,
}: {
  kind: DocumentKind
  initialState: DocumentEditorState
  clients: ClientOption[]
  projects: ProjectOption[]
  articles: ArticleOption[]
  packages: PackageOption[]
  companySettings: CompanySettings
  /** Bereits vergebene Dokumentnummer — `null` zeigt den Entwurfs-Zustand. */
  nummer?: string | null
  /** Gestellte Dokumente sind nicht mehr editierbar (GoBD). */
  readOnly?: boolean
  saveLabel: string
  onSave: (payload: ReturnType<typeof toPayload>) => Promise<SaveResult>
  /** Link zum echten PDF, sobald das Dokument gespeichert ist. */
  pdfUrl?: string
  /** Zusätzliche Aktionen (Stellen, Versenden, Status) unter dem Formular. */
  children?: React.ReactNode
}) {
  const [state, setState] = useState<DocumentEditorState>(initialState)
  const [fehler, setFehler] = useState<string | null>(null)
  const [gespeichert, setGespeichert] = useState(false)
  const [isPending, startTransition] = useTransition()
  const hatTexte = Boolean(initialState.einleitungstext.trim() || initialState.schlusstext.trim())
  // Bereits gefüllte Texte gleich aufgeklappt zeigen — sonst wäre nicht
  // erkennbar, dass auf dem Dokument ein Schlusstext steht.
  const [texteOffen, setTexteOffen] = useState(hatTexte)

  const manuell = state.empfaengerModus === 'manuell'
  const gewaehlterKunde = clients.find((c) => c.id === state.clientId) ?? null
  const kundenProjekte = projects.filter((p) => p.client_id === state.clientId)

  function patch(changes: Partial<DocumentEditorState>) {
    setState((prev) => ({ ...prev, ...changes }))
    setGespeichert(false)
  }

  function empfaengerPatch(changes: Partial<DocumentEditorState['recipient']>) {
    setState((prev) => ({ ...prev, recipient: { ...prev.recipient, ...changes } }))
    setGespeichert(false)
  }

  /**
   * Wechsel Kunde → manuell übernimmt die Daten des gewählten Kunden als
   * Startwert. So kann man eine Kundenanschrift für ein einzelnes Dokument
   * abwandeln, ohne alles neu zu tippen.
   */
  function modusWechseln(modus: DocumentEditorState['empfaengerModus']) {
    if (modus === 'manuell' && gewaehlterKunde && !state.recipient.name?.trim()) {
      setState((prev) => ({
        ...prev,
        empfaengerModus: modus,
        recipient: {
          ...LEERER_EMPFAENGER,
          name: gewaehlterKunde.display_name,
          zusatz: gewaehlterKunde.company_name ?? '',
          strasse: gewaehlterKunde.address_street ?? '',
          plz: gewaehlterKunde.address_zip ?? '',
          ort: gewaehlterKunde.address_city ?? '',
          land: gewaehlterKunde.address_country ?? 'Deutschland',
          kundennummer: gewaehlterKunde.client_number ?? '',
        },
      }))
    } else {
      patch({ empfaengerModus: modus })
    }
    setGespeichert(false)
  }

  // ── Vorschau-Daten ────────────────────────────────────────────────────────
  // Aus demselben Mapper wie serverseitig, damit Vorschau und gespeichertes
  // Dokument nicht auseinanderlaufen können.
  //
  // Bewusst OHNE useMemo: der React Compiler memoisiert das hier automatisch
  // und feiner, als es eine handgeschriebene Abhängigkeitsliste könnte. Die
  // referenzielle Stabilität ist wichtig, weil `DocumentPreview` per
  // useDeferredValue auf Objektidentität prüft — bei jedem Render ein neues
  // Objekt hieße Dauer-Neuaufbau der Vorschau.
  const vorschauItems: ItemLike[] = state.positionen
    .filter((p) => p.art_nr || p.pkt_nr || p.bezeichnung.trim())
    .map((p, index) => ({
      pos: index + 1,
      art_nr: p.art_nr ?? null,
      bezeichnung: p.bezeichnung.trim() || 'Ohne Bezeichnung',
      beschreibung: p.beschreibung.trim() || null,
      menge: p.menge || 0,
      ep: p.ep || 0,
      gesamt: Math.round((p.menge || 0) * (p.ep || 0) * 100) / 100,
      ep_label: p.epLabel.trim() || null,
      betrag_label: p.betragLabel.trim() || null,
      exclude_from_sum: p.excludeFromSum,
    }))

  const vorschauRecipient = manuell ? state.recipient : null
  const vorschauClient = manuell ? null : gewaehlterKunde
  const vorschauSumme = summe(state.positionen)

  const documentData =
    kind === 'rechnung'
      ? documentFromInvoice({
          invoice: {
            invoice_number: nummer ?? null,
            invoice_date: null,
            service_date: state.serviceDate || null,
            ust_pflichtig: companySettings.ust_pflichtig,
            total_net: vorschauSumme,
            recipient: vorschauRecipient,
            einleitungstext: state.einleitungstext.trim() || null,
            schlusstext: state.schlusstext.trim() || null,
          },
          client: vorschauClient,
          items: vorschauItems,
          companySettings,
        })
      : documentFromOffer({
          offer: {
            offer_number: nummer ?? null,
            created_at: null,
            valid_until: state.validUntil || null,
            total_net: vorschauSumme,
            recipient: vorschauRecipient,
            einleitungstext: state.einleitungstext.trim() || null,
            schlusstext: state.schlusstext.trim() || null,
          },
          client: vorschauClient,
          items: vorschauItems,
          companySettings,
        })

  function speichern() {
    setFehler(null)
    const payload = toPayload(state)

    if (payload.positionen.length === 0) {
      setFehler('Mindestens eine Position mit Bezeichnung oder Katalogartikel wird gebraucht.')
      return
    }
    if (!payload.clientId && !payload.recipient?.name?.trim()) {
      setFehler('Empfänger fehlt — entweder einen Kunden auswählen oder einen Namen eintragen.')
      return
    }

    startTransition(async () => {
      const result = await onSave(payload)
      if (result.status === 'error') {
        setFehler(result.message)
        setGespeichert(false)
      } else {
        setFehler(null)
        setGespeichert(true)
      }
    })
  }

  const gesamt = summe(state.positionen)

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
      {/* ── Konfiguration ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 min-w-0">
        <Karte titel="Empfänger">
          <div className="inline-flex rounded-lg bg-gray-100 p-0.5 self-start">
            {(
              [
                { key: 'kunde' as const, label: 'Aus Kundenstamm' },
                { key: 'manuell' as const, label: 'Frei eintragen' },
              ]
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => modusWechseln(option.key)}
                disabled={readOnly}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                  state.empfaengerModus === option.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                style={FONT}
              >
                {option.label}
              </button>
            ))}
          </div>

          {manuell ? (
            // Dichtes Raster statt einer Spalte untereinander — die Anschrift
            // ist ein zusammenhängender Block und liest sich so auch als einer.
            <div className="grid grid-cols-6 gap-2">
              <div className="col-span-6">
                <Feld label="Name / Firma">
                  <input
                    value={state.recipient.name ?? ''}
                    onChange={(e) => empfaengerPatch({ name: e.target.value })}
                    disabled={readOnly}
                    placeholder="Max Mustermann"
                    className={inputClass}
                    style={FONT}
                  />
                </Feld>
              </div>
              <div className="col-span-6">
                <Feld label="Zusatzzeile" hint="z. B. die Firma, wenn oben eine Person steht">
                  <input
                    value={state.recipient.zusatz ?? ''}
                    onChange={(e) => empfaengerPatch({ zusatz: e.target.value })}
                    disabled={readOnly}
                    placeholder="Mustermann GmbH"
                    className={inputClass}
                    style={FONT}
                  />
                </Feld>
              </div>
              <div className="col-span-6">
                <Feld label="Straße und Hausnummer">
                  <input
                    value={state.recipient.strasse ?? ''}
                    onChange={(e) => empfaengerPatch({ strasse: e.target.value })}
                    disabled={readOnly}
                    className={inputClass}
                    style={FONT}
                  />
                </Feld>
              </div>
              <div className="col-span-2">
                <Feld label="PLZ">
                  <input
                    value={state.recipient.plz ?? ''}
                    onChange={(e) => empfaengerPatch({ plz: e.target.value })}
                    disabled={readOnly}
                    className={inputClass}
                    style={FONT}
                  />
                </Feld>
              </div>
              <div className="col-span-4">
                <Feld label="Ort">
                  <input
                    value={state.recipient.ort ?? ''}
                    onChange={(e) => empfaengerPatch({ ort: e.target.value })}
                    disabled={readOnly}
                    className={inputClass}
                    style={FONT}
                  />
                </Feld>
              </div>
              <div className="col-span-2">
                <Feld label="Land">
                  <input
                    value={state.recipient.land ?? ''}
                    onChange={(e) => empfaengerPatch({ land: e.target.value })}
                    disabled={readOnly}
                    className={inputClass}
                    style={FONT}
                  />
                </Feld>
              </div>
              <div className="col-span-2">
                <Feld label="Kundennr.">
                  <input
                    value={state.recipient.kundennummer ?? ''}
                    onChange={(e) => empfaengerPatch({ kundennummer: e.target.value })}
                    disabled={readOnly}
                    className={inputClass}
                    style={FONT}
                  />
                </Feld>
              </div>
              <div className="col-span-2">
                <Feld label={kind === 'rechnung' ? 'Leistung am' : 'Gültig bis'}>
                  <input
                    type="date"
                    value={kind === 'rechnung' ? state.serviceDate : state.validUntil}
                    onChange={(e) =>
                      patch(kind === 'rechnung' ? { serviceDate: e.target.value } : { validUntil: e.target.value })
                    }
                    disabled={readOnly}
                    className={inputClass}
                    style={FONT}
                  />
                </Feld>
              </div>
              <div className="col-span-6">
                <Feld label="E-Mail" hint="Für den späteren Versand als PDF-Anhang">
                  <input
                    type="email"
                    value={state.recipient.email ?? ''}
                    onChange={(e) => empfaengerPatch({ email: e.target.value })}
                    disabled={readOnly}
                    className={inputClass}
                    style={FONT}
                  />
                </Feld>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-2">
              <div className={kundenProjekte.length > 0 ? 'col-span-4' : 'col-span-6'}>
                <Feld label="Kunde">
                  <select
                    value={state.clientId}
                    onChange={(e) => patch({ clientId: e.target.value, projectId: '' })}
                    disabled={readOnly}
                    className={inputClass}
                    style={FONT}
                  >
                    <option value="">Kunde wählen…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.client_number ? `${c.client_number} · ` : ''}
                        {c.display_name}
                      </option>
                    ))}
                  </select>
                </Feld>
              </div>

              {kundenProjekte.length > 0 && (
                <div className="col-span-2">
                  <Feld label="Projekt">
                    <select
                      value={state.projectId}
                      onChange={(e) => patch({ projectId: e.target.value })}
                      disabled={readOnly}
                      className={inputClass}
                      style={FONT}
                    >
                      <option value="">—</option>
                      {kundenProjekte.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </Feld>
                </div>
              )}

              <div className="col-span-3">
                <Feld
                  label={kind === 'rechnung' ? 'Leistungsdatum' : 'Gültig bis'}
                  hint={kind === 'rechnung' ? 'Pflichtangabe nach § 14 UStG' : undefined}
                >
                  <input
                    type="date"
                    value={kind === 'rechnung' ? state.serviceDate : state.validUntil}
                    onChange={(e) =>
                      patch(kind === 'rechnung' ? { serviceDate: e.target.value } : { validUntil: e.target.value })
                    }
                    disabled={readOnly}
                    className={inputClass}
                    style={FONT}
                  />
                </Feld>
              </div>

              {gewaehlterKunde && !gewaehlterKunde.address_street && (
                <p className="col-span-6 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2" style={FONT}>
                  Für diesen Kunden ist keine Anschrift hinterlegt — auf dem Dokument fehlt sie dann. Entweder im
                  Kundenstamm ergänzen oder hier auf „Frei eintragen“ wechseln.
                </p>
              )}
            </div>
          )}

          {/* Freitexte sind optional und meist leer — eingeklappt, damit sie
              das Formular nicht künstlich verlängern. */}
          <div className="border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => setTexteOffen((v) => !v)}
              className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors"
              style={FONT}
            >
              {texteOffen ? '− Texte' : '+ Texte'}
              {!texteOffen && hatTexte && <span className="ml-1.5 text-gray-900">·</span>}
            </button>

            {texteOffen && (
              <div className="flex flex-col gap-3 mt-3">
                <Feld label="Einleitungstext" hint="Steht unter der Anrede. Leer lassen für den Standardtext.">
                  <textarea
                    value={state.einleitungstext}
                    onChange={(e) => patch({ einleitungstext: e.target.value })}
                    disabled={readOnly}
                    rows={2}
                    className={`${inputClass} resize-y min-h-16`}
                    style={FONT}
                  />
                </Feld>
                <Feld label="Schlusstext" hint="Steht unter den Hinweisen, vor der Grußformel.">
                  <textarea
                    value={state.schlusstext}
                    onChange={(e) => patch({ schlusstext: e.target.value })}
                    disabled={readOnly}
                    rows={4}
                    className={`${inputClass} resize-y min-h-24`}
                    style={FONT}
                  />
                </Feld>
              </div>
            )}
          </div>
        </Karte>

        <Karte titel="Positionen">
          <PositionsEditor
            positionen={state.positionen}
            articles={articles}
            packages={packages}
            disabled={readOnly}
            onChange={(positionen) => patch({ positionen })}
          />
          <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-1">
            <span className="text-sm font-medium text-gray-500" style={FONT}>
              Gesamtbetrag
            </span>
            <span className="text-base font-bold text-gray-900 tabular-nums" style={FONT}>
              {gesamt.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
          </div>
        </Karte>

        {fehler && (
          <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3" style={FONT}>
            {fehler}
          </p>
        )}

        {!readOnly && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={speichern}
              disabled={isPending}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
              style={FONT}
            >
              {isPending ? 'Speichert…' : saveLabel}
            </button>
            {gespeichert && (
              <span className="text-sm text-green-700" style={FONT}>
                Gespeichert.
              </span>
            )}
          </div>
        )}

        {children}
      </div>

      {/* ── Live-Vorschau ──────────────────────────────────────────────── */}
      <div className="xl:sticky xl:top-6 min-w-0">
        <DocumentPreview data={documentData} theme={DEFAULT_THEME} pdfUrl={pdfUrl} />
      </div>
    </div>
  )
}

/** Startzustand für ein neues Dokument. */
export function leererZustand(kind: DocumentKind, positionen?: PositionDraft[]): DocumentEditorState {
  return {
    empfaengerModus: 'kunde',
    clientId: '',
    recipient: { ...LEERER_EMPFAENGER },
    projectId: '',
    serviceDate: kind === 'rechnung' ? new Date().toISOString().slice(0, 10) : '',
    validUntil: '',
    einleitungstext: '',
    schlusstext: '',
    positionen: positionen ?? [{ ...LEERE_POSITION }],
  }
}
