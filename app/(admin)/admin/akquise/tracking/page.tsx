import Link from 'next/link'
import * as akquiseDomain from '@/lib/domain/akquise'
import { TrackingForm } from './TrackingForm'

function pct(numerator: number, denominator: number) {
  if (denominator === 0) return '—'
  return `${Math.round((numerator / denominator) * 1000) / 10}%`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })
}

export default async function AkquiseTrackingPage() {
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - 13)

  const rows = await akquiseDomain.listAkquiseTracking({ fromDate: fromDate.toISOString().slice(0, 10) })

  const last7 = rows.filter((r) => {
    const d = new Date(r.datum)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return d >= sevenDaysAgo
  })

  const weekTotals = last7.reduce(
    (acc, r) => ({
      waehlversuche: acc.waehlversuche + r.waehlversuche,
      gespraeche_empfang: acc.gespraeche_empfang + r.gespraeche_empfang,
      gespraeche_entscheider: acc.gespraeche_entscheider + r.gespraeche_entscheider,
      termine_vereinbart: acc.termine_vereinbart + r.termine_vereinbart,
    }),
    { waehlversuche: 0, gespraeche_empfang: 0, gespraeche_entscheider: 0, termine_vereinbart: 0 }
  )

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/akquise" className="hover:text-gray-600 transition-colors">
          Akquise
        </Link>
        <span>/</span>
        <span className="text-gray-700">Tracking</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Kalt-Akquise-Tracking
        </h1>
        <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Tägliche Wählversuche, Gespräche und Termine erfassen — Quoten werden automatisch berechnet.
        </p>
      </div>

      {/* Eingabe */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Heute eintragen
        </h2>
        <TrackingForm />
      </div>

      {/* Wochenübersicht */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Woche (letzte 7 Tage)
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

      {/* Tagesliste */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Letzte 14 Tage
          </h2>
        </div>
        {rows.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Noch keine Einträge.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Datum
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Wählversuche
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Empfang
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Entscheider
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Termine
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-6 py-3 text-sm text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {fmtDate(row.datum)}
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
        )}
      </div>
    </div>
  )
}
