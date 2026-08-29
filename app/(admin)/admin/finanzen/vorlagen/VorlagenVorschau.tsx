'use client'

import { useState } from 'react'
import { DocumentPreview } from '@/components/documents/DocumentPreview'
import { DEFAULT_THEME } from '@/lib/documents/theme'
import { BEISPIEL_RECHNUNG, BEISPIEL_ANGEBOT } from '@/lib/documents/sample'
import type { DocumentData } from '@/lib/documents/types'

/**
 * Vorschau der Dokumentvorlagen mit den Stresstest-Beispieldaten.
 *
 * Der Sinn der harten Beispieldaten (überlanger Firmenname, mehrzeilige
 * Positionsbeschreibungen, mehrseitiger Schlusstext): Layoutbrüche fallen
 * sofort auf, statt erst beim echten Kunden. Wenn die Vorlage hiermit sauber
 * umbricht, hält sie auch alles andere aus.
 *
 * Hier kommen in Phase 7 die Theme-Regler dazu (Ränder, Farben, Spaltenbreiten).
 * Bis dahin ist die Seite reine Ansicht des Standard-Themes.
 */

const VORLAGEN: { key: string; label: string; data: DocumentData }[] = [
  { key: 'rechnung', label: 'Rechnung', data: BEISPIEL_RECHNUNG },
  { key: 'angebot', label: 'Angebot', data: BEISPIEL_ANGEBOT },
  {
    key: 'entwurf',
    label: 'Rechnung (Entwurf)',
    data: { ...BEISPIEL_RECHNUNG, nummer: null, entwurf: true },
  },
  {
    key: 'kurz',
    label: 'Kurze Rechnung',
    data: {
      ...BEISPIEL_RECHNUNG,
      positionen: BEISPIEL_RECHNUNG.positionen.slice(0, 1),
      summe: { ...BEISPIEL_RECHNUNG.summe, netto: 3400 },
      schlusstext: null,
    },
  },
]

export function VorlagenVorschau() {
  const [aktiv, setAktiv] = useState(VORLAGEN[0].key)
  const vorlage = VORLAGEN.find((v) => v.key === aktiv) ?? VORLAGEN[0]

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2
            className="text-sm font-semibold text-gray-900 mb-3"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Beispiel
          </h2>
          <div className="flex flex-col gap-1">
            {VORLAGEN.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setAktiv(v.key)}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  v.key === aktiv
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-sm text-gray-500 leading-relaxed"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          <p className="font-semibold text-gray-900 mb-2">Warum diese Beispieldaten?</p>
          <p>
            Überlange Firmennamen, mehrzeilige Positionen und ein mehrseitiger Schlusstext — genau die
            Fälle, an denen die Word-Vorlage verrutscht ist. Bricht es hier sauber um, hält es auch echte
            Kundendaten aus.
          </p>
          <p className="mt-3">
            Die Vorschau benutzt exakt dieselbe Render-Funktion wie der PDF-Export. Was hier steht, steht
            auch im PDF.
          </p>
        </div>
      </aside>

      <DocumentPreview data={vorlage.data} theme={DEFAULT_THEME} />
    </div>
  )
}
