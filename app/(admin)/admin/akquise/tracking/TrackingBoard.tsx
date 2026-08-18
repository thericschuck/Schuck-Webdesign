'use client'

import { useMemo, useState } from 'react'

export interface TrackingRow {
  id: string
  datum: string
  wer: string
  waehlversuche: number
  gespraeche_empfang: number
  gespraeche_entscheider: number
  termine_vereinbart: number
}

type RangeDays = 14 | 30 | 60

function pct(numerator: number, denominator: number) {
  if (denominator === 0) return '—'
  return `${Math.round((numerator / denominator) * 1000) / 10}%`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })
}

function sumTotals(rows: TrackingRow[]) {
  return rows.reduce(
    (acc, r) => ({
      waehlversuche: acc.waehlversuche + r.waehlversuche,
      gespraeche_empfang: acc.gespraeche_empfang + r.gespraeche_empfang,
      gespraeche_entscheider: acc.gespraeche_entscheider + r.gespraeche_entscheider,
      termine_vereinbart: acc.termine_vereinbart + r.termine_vereinbart,
    }),
    { waehlversuche: 0, gespraeche_empfang: 0, gespraeche_entscheider: 0, termine_vereinbart: 0 }
  )
}

/** Ein Balken pro Tag über die letzten 14 Tage — schneller visueller Trend als die reine Tabelle. */
function TrendBars({ rows }: { rows: TrackingRow[] }) {
  const days = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const r of rows) byDate.set(r.datum, (byDate.get(r.datum) ?? 0) + r.waehlversuche)

    const out: { datum: string; value: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      out.push({ datum: iso, value: byDate.get(iso) ?? 0 })
    }
    return out
  }, [rows])

  const max = Math.max(1, ...days.map((d) => d.value))

  return (
    <div className="flex items-end gap-1.5 h-20">
      {days.map((d) => (
        <div key={d.datum} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className={`w-full rounded-t-sm transition-colors ${d.value > 0 ? 'bg-gray-800 group-hover:bg-gray-600' : 'bg-gray-100'}`}
            style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 6 : 3)}%` }}
            title={`${new Date(d.datum).toLocaleDateString('de-DE')}: ${d.value} Wählversuche`}
          />
        </div>
      ))}
    </div>
  )
}

export function TrackingBoard({ rows }: { rows: TrackingRow[] }) {
  const [wer, setWer] = useState<string | null>(null)
  const [rangeDays, setRangeDays] = useState<RangeDays>(14)

  const people = useMemo(() => Array.from(new Set(rows.map((r) => r.wer))).sort(), [rows])

  const filteredByWer = useMemo(() => (wer ? rows.filter((r) => r.wer === wer) : rows), [rows, wer])

  const sevenDaysAgo = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d
  }, [])
  const weekTotals = useMemo(
    () => sumTotals(filteredByWer.filter((r) => new Date(r.datum) >= sevenDaysAgo)),
    [filteredByWer, sevenDaysAgo]
  )

  const rangeCutoff = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - (rangeDays - 1))
    return d
  }, [rangeDays])

  const visibleRows = useMemo(
    () =>
      filteredByWer
        .filter((r) => new Date(r.datum) >= rangeCutoff)
        .sort((a, b) => b.datum.localeCompare(a.datum) || a.wer.localeCompare(b.wer)),
    [filteredByWer, rangeCutoff]
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Personen-Filter */}
      {people.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setWer(null)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              !wer ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Alle
          </button>
          {people.map((person) => (
            <button
              key={person}
              onClick={() => setWer(person)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                wer === person ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {person}
            </button>
          ))}
        </div>
      )}

      {/* Wochenübersicht */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Woche (letzte 7 Tage){wer ? ` — ${wer}` : ''}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Wählversuche
            </p>
            <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
              {weekTotals.waehlversuche}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Empfang ({pct(weekTotals.gespraeche_empfang, weekTotals.waehlversuche)})
            </p>
            <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
              {weekTotals.gespraeche_empfang}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Entscheider ({pct(weekTotals.gespraeche_entscheider, weekTotals.gespraeche_empfang)})
            </p>
            <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
              {weekTotals.gespraeche_entscheider}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Termine ({pct(weekTotals.termine_vereinbart, weekTotals.gespraeche_entscheider)})
            </p>
            <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
              {weekTotals.termine_vereinbart}
            </p>
          </div>
        </div>
      </div>

      {/* Trend */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Wählversuche — letzte 14 Tage{wer ? ` — ${wer}` : ''}
        </h2>
        <TrendBars rows={filteredByWer} />
      </div>

      {/* Tagesliste */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Tagesliste
          </h2>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {([14, 30, 60] as RangeDays[]).map((days) => (
              <button
                key={days}
                onClick={() => setRangeDays(days)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  rangeDays === days ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {days} Tage
              </button>
            ))}
          </div>
        </div>
        {visibleRows.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Noch keine Einträge — nach dem ersten Sheet-Sync erscheinen hier Daten.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Datum', 'Wer', 'Wählversuche', 'Empfang', 'Entscheider', 'Termine'].map((h) => (
                    <th
                      key={h}
                      className={`px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap ${
                        h === 'Datum' || h === 'Wer' ? 'text-left' : 'text-right'
                      }`}
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-700 whitespace-nowrap" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {fmtDate(row.datum)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700 whitespace-nowrap" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {row.wer}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700 text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {row.waehlversuche}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700 text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {row.gespraeche_empfang}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700 text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {row.gespraeche_entscheider}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700 text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {row.termine_vereinbart}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
