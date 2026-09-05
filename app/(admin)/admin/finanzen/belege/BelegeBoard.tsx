'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye } from 'lucide-react'
import type { BelegRow, BelegStatus, BelegTyp } from '@/lib/domain/belege'

/**
 * Gemeinsame Liste aus Angeboten und Rechnungen.
 *
 * Bewusst eine flache Tabelle statt Karten in Karten: die Zeilen sind
 * gleichförmig (Typ, Nummer, Empfänger, Betrag, Status) und lassen sich so
 * scannen. Gerahmt ist nur der Container, nicht jede Zeile — das war der
 * Hauptgrund für die zerstückelte Wirkung der alten Ansicht.
 */

const FONT = { fontFamily: 'var(--font-dm-sans)' } as const

const STATUS_LABEL: Record<BelegStatus, string> = {
  entwurf: 'Entwurf',
  offen: 'Offen',
  bezahlt: 'Bezahlt',
  angenommen: 'Angenommen',
  abgelehnt: 'Abgelehnt',
  storniert: 'Storniert',
}

const STATUS_DOT: Record<BelegStatus, string> = {
  entwurf: 'bg-gray-300',
  offen: 'bg-blue-500',
  bezahlt: 'bg-green-500',
  angenommen: 'bg-green-500',
  abgelehnt: 'bg-red-400',
  storniert: 'bg-gray-400',
}

const TYP_LABEL: Record<BelegTyp, string> = {
  angebot: 'Angebot',
  rechnung: 'Rechnung',
}

function fmtEuro(value: number) {
  return `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'
}

type TypFilter = 'alle' | BelegTyp

export function BelegeBoard({ belege }: { belege: BelegRow[] }) {
  const router = useRouter()
  const [typ, setTyp] = useState<TypFilter>('alle')
  const [status, setStatus] = useState<BelegStatus | null>(null)
  const [search, setSearch] = useState('')
  const [zeigeTest, setZeigeTest] = useState(false)

  const [jahr, setJahr] = useState<string>('alle')

  const testAnzahl = useMemo(() => belege.filter((b) => b.isTest).length, [belege])

  // Jahresfilter ersetzt den früheren Von/Bis-Zeitraum der Rechnungsliste —
  // für Steuer und Jahresabschluss ist das der Schnitt, den man wirklich
  // braucht, und er kostet nur ein Auswahlfeld statt zweier Datumsfelder.
  const jahre = useMemo(() => {
    const set = new Set<string>()
    for (const b of belege) if (b.datum) set.add(b.datum.slice(0, 4))
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [belege])

  const sichtbar = useMemo(
    () =>
      belege
        .filter((b) => zeigeTest || !b.isTest)
        .filter((b) => jahr === 'alle' || b.datum?.startsWith(jahr)),
    [belege, zeigeTest, jahr]
  )

  const typAnzahl = useMemo(
    () => ({
      alle: sichtbar.length,
      angebot: sichtbar.filter((b) => b.typ === 'angebot').length,
      rechnung: sichtbar.filter((b) => b.typ === 'rechnung').length,
    }),
    [sichtbar]
  )

  // Statuszähler richten sich nach dem Typfilter — sonst zeigt „Bezahlt 6"
  // eine Zahl, die es unter „Angebote" gar nicht geben kann.
  const nachTyp = useMemo(
    () => (typ === 'alle' ? sichtbar : sichtbar.filter((b) => b.typ === typ)),
    [sichtbar, typ]
  )

  const statusAnzahl = useMemo(() => {
    const map = new Map<BelegStatus, number>()
    for (const b of nachTyp) map.set(b.status, (map.get(b.status) ?? 0) + 1)
    return map
  }, [nachTyp])

  const verfuegbareStatus = useMemo(
    () => (Object.keys(STATUS_LABEL) as BelegStatus[]).filter((s) => (statusAnzahl.get(s) ?? 0) > 0),
    [statusAnzahl]
  )

  const gefiltert = useMemo(() => {
    const q = search.trim().toLowerCase()
    return nachTyp
      .filter((b) => !status || b.status === status)
      .filter((b) => !q || b.nummer?.toLowerCase().includes(q) || b.empfaenger.toLowerCase().includes(q))
  }, [nachTyp, status, search])

  const summe = useMemo(() => gefiltert.reduce((s, b) => s + b.betrag, 0), [gefiltert])

  return (
    <div className="flex flex-col gap-5">
      {/* Filterleiste */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
          {(['alle', 'angebot', 'rechnung'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTyp(t)
                setStatus(null)
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                typ === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
              style={FONT}
            >
              {t === 'alle' ? 'Alle' : t === 'angebot' ? 'Angebote' : 'Rechnungen'}{' '}
              <span className="text-gray-400">{typAnzahl[t]}</span>
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nummer oder Empfänger…"
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 min-w-50"
          style={FONT}
        />

        {jahre.length > 1 && (
          <select
            value={jahr}
            onChange={(e) => setJahr(e.target.value)}
            aria-label="Jahr"
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            style={FONT}
          >
            <option value="alle">Alle Jahre</option>
            {jahre.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {verfuegbareStatus.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s === status ? null : s)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                status === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
              style={FONT}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status === s ? 'bg-white' : STATUS_DOT[s]}`} />
              {STATUS_LABEL[s]} {statusAnzahl.get(s)}
            </button>
          ))}
          {testAnzahl > 0 && (
            <button
              type="button"
              onClick={() => setZeigeTest((v) => !v)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                zeigeTest ? 'bg-amber-100 text-amber-800' : 'text-gray-400 hover:bg-gray-100'
              }`}
              style={FONT}
            >
              Test {testAnzahl}
            </button>
          )}
        </div>
      </div>

      {/* Liste */}
      {gefiltert.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-500" style={FONT}>
            {belege.length === 0 ? 'Noch keine Belege.' : 'Nichts für diesen Filter.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {gefiltert.map((beleg, index) => (
            <div
              key={`${beleg.typ}-${beleg.id}`}
              onClick={() => {
                // Nicht navigieren, wenn der Nutzer nur Text markieren wollte
                // (z.B. um eine Belegnummer zu kopieren).
                if (window.getSelection()?.toString()) return
                router.push(beleg.href)
              }}
              className={`grid grid-cols-[6.5rem_minmax(0,1fr)_6rem_2.25rem] sm:grid-cols-[6.5rem_7rem_minmax(0,1fr)_5rem_8.5rem_7rem_2.25rem] items-center gap-x-4 gap-y-1 px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors ${
                index > 0 ? 'border-t border-gray-100' : ''
              }`}
            >
              {/* Typ */}
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md text-center ${
                  beleg.typ === 'angebot' ? 'bg-violet-50 text-violet-700' : 'bg-gray-100 text-gray-600'
                }`}
                style={FONT}
              >
                {TYP_LABEL[beleg.typ]}
              </span>

              {/* Nummer */}
              <span
                className={`hidden sm:block text-sm tabular-nums ${beleg.nummer ? 'text-gray-700' : 'text-gray-300'}`}
                style={FONT}
              >
                {beleg.nummer ?? '—'}
              </span>

              {/* Empfänger */}
              <span className="text-sm font-medium text-gray-900 truncate" style={FONT}>
                {beleg.empfaenger}
                {beleg.isTest && <span className="ml-2 text-[10px] text-amber-700">TEST</span>}
              </span>

              {/* Datum */}
              <span className="hidden sm:block text-xs text-gray-400 tabular-nums text-center" style={FONT}>
                {fmtDate(beleg.datum)}
              </span>

              {/* Status — bei Überfälligkeit steht hier die Frist statt des Status,
                  weil dann das Datum die eigentliche Information ist. */}
              <span className="hidden sm:flex items-center justify-center gap-1.5 text-xs" style={FONT}>
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    beleg.ueberfaellig ? 'bg-red-500' : STATUS_DOT[beleg.status]
                  }`}
                />
                <span className={beleg.ueberfaellig ? 'text-red-600 font-medium' : 'text-gray-500'}>
                  {beleg.ueberfaellig ? `Fällig ${fmtDate(beleg.frist)}` : STATUS_LABEL[beleg.status]}
                </span>
              </span>

              {/* Betrag */}
              <span className="text-sm font-semibold text-gray-900 tabular-nums text-center" style={FONT}>
                {fmtEuro(beleg.betrag)}
              </span>

              {/* PDF-Vorschau — eigenes Fenster, damit der Klick nicht auf die
                  Zeile durchschlägt und stattdessen navigiert. */}
              <a
                href={`/api/admin/documents/pdf?typ=${beleg.typ}&id=${beleg.id}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="PDF-Vorschau"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors justify-self-center"
              >
                <Eye className="w-4 h-4" strokeWidth={1.75} />
              </a>

              {/* Zweite Zeile auf schmalen Schirmen */}
              <span className="sm:hidden col-span-4 text-xs text-gray-400 flex items-center gap-2" style={FONT}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[beleg.status]}`} />
                {beleg.ueberfaellig ? 'Überfällig' : STATUS_LABEL[beleg.status]}
                <span>·</span>
                {beleg.nummer ?? 'ohne Nummer'}
                <span>·</span>
                {fmtDate(beleg.datum)}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-right" style={FONT}>
        {gefiltert.length} {gefiltert.length === 1 ? 'Beleg' : 'Belege'} · {fmtEuro(summe)}
      </p>
    </div>
  )
}
