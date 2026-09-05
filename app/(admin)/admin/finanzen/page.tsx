import Link from 'next/link'
import { assertAdmin } from '@/lib/auth/assert-admin'
import * as financeDomain from '@/lib/domain/finance'
import { RevenueBarChart } from './RevenueBarChart'
import { FinanzenHeader } from './FinanzenHeader'

const FONT = { fontFamily: 'var(--font-dm-sans)' } as const

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'
}

function fmtEuro(value: number) {
  return `${value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`
}

/**
 * Kennzahl im Kopfbereich.
 *
 * Bewusst ohne Kartenrahmen und mit klarer Hierarchie: der Jahresumsatz ist
 * die Leitzahl, „Überfällig" springt nur dann heraus, wenn dort tatsächlich
 * etwas steht. Vorher sahen alle vier Kacheln gleich aus und man musste jede
 * einzeln lesen, um zu sehen, wo Handlungsbedarf ist.
 */
function Kennzahl({
  label,
  value,
  gross = false,
  warnung = false,
}: {
  label: string
  value: number
  gross?: boolean
  warnung?: boolean
}) {
  const aktiv = warnung && value > 0
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-xs ${aktiv ? 'text-red-600 font-medium' : 'text-gray-400'}`} style={FONT}>
        {label}
      </span>
      <span
        className={`font-bold tabular-nums ${gross ? 'text-3xl' : 'text-xl'} ${
          aktiv ? 'text-red-600' : value === 0 && warnung ? 'text-gray-300' : 'text-gray-900'
        }`}
        style={{ fontFamily: 'var(--font-playfair)' }}
      >
        {fmtEuro(value)}
      </span>
    </div>
  )
}

/** Abschnittsüberschrift statt eigener Karte — hält die Seite ruhig. */
function Abschnitt({
  titel,
  aktion,
  children,
}: {
  titel: string
  aktion?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900" style={FONT}>
          {titel}
        </h2>
        {aktion}
      </div>
      {children}
    </section>
  )
}

export default async function FinanceDashboardPage() {
  await assertAdmin()
  const overview = await financeDomain.getRevenueOverview()

  return (
    <div className="flex flex-col gap-8">
      <FinanzenHeader untertitel="Umsatz, offene Posten und Fälligkeiten" />

      {/* Kennzahlen — eine Leitzahl, drei Nebenzahlen, kein Kartenraster */}
      <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
        <Kennzahl label="Umsatz dieses Jahr" value={overview.revenue_this_year} gross />
        <Kennzahl label="Diesen Monat" value={overview.revenue_this_month} />
        <Kennzahl label="Offen" value={overview.open_amount} />
        <Kennzahl label="Überfällig" value={overview.overdue_amount} warnung />
      </div>

      <Abschnitt titel="Umsatz pro Monat">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
          <RevenueBarChart data={overview.by_month} />
        </div>
      </Abschnitt>

      {overview.open_invoices.length > 0 && (
        <Abschnitt
          titel="Offene Rechnungen"
          aktion={
            <Link
              href="/admin/finanzen/belege"
              className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors"
              style={FONT}
            >
              Alle Belege →
            </Link>
          }
        >
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            {overview.open_invoices.map((inv, index) => (
              <Link
                key={inv.id}
                href={`/admin/finanzen/rechnungen/${inv.id}`}
                className={`flex items-center justify-between gap-4 px-5 py-3 hover:bg-gray-50 transition-colors ${
                  index > 0 ? 'border-t border-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${inv.is_overdue ? 'bg-red-500' : 'bg-blue-500'}`}
                  />
                  <span className="text-sm text-gray-500 tabular-nums shrink-0" style={FONT}>
                    {inv.invoice_number}
                  </span>
                  <span className="text-sm font-medium text-gray-900 truncate" style={FONT}>
                    {inv.display_name}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span
                    className={`text-xs ${inv.is_overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}
                    style={FONT}
                  >
                    {inv.is_overdue ? 'überfällig' : fmtDate(inv.invoice_date)}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums" style={FONT}>
                    {inv.total_net.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Abschnitt>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Abschnitt titel="Umsatz nach Kunde">
          <Verteilung
            eintraege={overview.by_client.slice(0, 8).map((c) => ({
              key: c.client_id ?? 'ohne',
              label: c.display_name,
              wert: c.total_net,
            }))}
          />
        </Abschnitt>

        <Abschnitt titel="Umsatz nach Kategorie">
          <Verteilung
            eintraege={overview.by_category.map((c) => ({
              key: c.kategorie,
              label: c.kategorie,
              wert: c.total_net,
            }))}
          />
        </Abschnitt>
      </div>
    </div>
  )
}

/**
 * Verteilungsliste mit Anteilsbalken. Der Balken macht Größenverhältnisse
 * sofort sichtbar — bei reinen Zahlenspalten musste man vorher vergleichen.
 */
function Verteilung({ eintraege }: { eintraege: { key: string; label: string; wert: number }[] }) {
  if (eintraege.length === 0) {
    return (
      <p className="text-sm text-gray-400" style={FONT}>
        Noch keine Daten.
      </p>
    )
  }

  const max = Math.max(...eintraege.map((e) => e.wert), 1)

  return (
    <div className="flex flex-col gap-2.5">
      {eintraege.map((e) => (
        <div key={e.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-gray-700 truncate" style={FONT}>
              {e.label}
            </span>
            <span className="text-sm font-medium text-gray-900 tabular-nums shrink-0" style={FONT}>
              {e.wert.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
            </span>
          </div>
          <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-gray-800" style={{ width: `${(e.wert / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
