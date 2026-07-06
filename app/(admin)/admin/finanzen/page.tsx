import Link from 'next/link'
import * as financeDomain from '@/lib/domain/finance'
import { RevenueBarChart } from './RevenueBarChart'

function fmtEuro(value: number) {
  return `${value.toLocaleString('de-DE')} €`
}

export default async function FinanceDashboardPage() {
  const overview = await financeDomain.getRevenueOverview()

  const tiles = [
    { label: 'Umsatz (Monat)', value: overview.revenue_this_month, color: 'text-gray-900' },
    { label: 'Umsatz (Jahr)', value: overview.revenue_this_year, color: 'text-gray-900' },
    { label: 'Offen', value: overview.open_amount, color: 'text-blue-700' },
    { label: 'Überfällig', value: overview.overdue_amount, color: 'text-red-700' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Finanzen
          </h1>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Umsatzübersicht und Rechnungsverwaltung
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/finanzen/rechnungen"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Rechnungen
          </Link>
          <Link
            href="/admin/finanzen/einstellungen"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Einstellungen
          </Link>
          <Link
            href="/admin/finanzen/rechnungen/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Neue Rechnung
          </Link>
        </div>
      </div>

      {/* Kacheln */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-gray-500 text-xs mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {tile.label}
            </p>
            <p className={`text-2xl font-bold ${tile.color}`} style={{ fontFamily: 'var(--font-playfair)' }}>
              {fmtEuro(tile.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Balkendiagramm */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Umsatz pro Monat (laufendes Jahr)
        </h2>
        <RevenueBarChart data={overview.by_month} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nach Kunde */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Umsatz nach Kunde
          </h2>
          {overview.by_client.length === 0 ? (
            <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Noch keine Daten.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {overview.by_client.slice(0, 8).map((c) => (
                <div key={c.client_id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {c.display_name}
                  </span>
                  <span className="text-sm text-gray-900 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {fmtEuro(c.total_net)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nach Kategorie */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Umsatz nach Kategorie
          </h2>
          {overview.by_category.length === 0 ? (
            <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Noch keine Daten.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {overview.by_category.map((c) => (
                <div key={c.kategorie} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {c.kategorie}
                  </span>
                  <span className="text-sm text-gray-900 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {fmtEuro(c.total_net)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
