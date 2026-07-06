import Link from 'next/link'
import * as financeDomain from '@/lib/domain/finance'
import type { InvoiceStatus } from '@/types/database'

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  entwurf: 'Entwurf',
  versendet: 'Versendet',
  bezahlt: 'Bezahlt',
  storniert: 'Storniert',
}

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  entwurf: 'bg-gray-100 text-gray-600',
  versendet: 'bg-blue-50 text-blue-700',
  bezahlt: 'bg-green-50 text-green-700',
  storniert: 'bg-red-50 text-red-700',
}

function fmtEuro(value: number | null) {
  return value == null ? '—' : `${value.toLocaleString('de-DE')} €`
}

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
}

interface SearchParams {
  status?: string
}

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const status = (sp.status as InvoiceStatus) || undefined

  const invoices = await financeDomain.listInvoices({ status })

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/finanzen" className="hover:text-gray-600 transition-colors">
          Finanzen
        </Link>
        <span>/</span>
        <span className="text-gray-700">Rechnungen</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Rechnungen
          </h1>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {invoices.length} {invoices.length === 1 ? 'Rechnung' : 'Rechnungen'}
          </p>
        </div>
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

      {/* Statusfilter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/admin/finanzen/rechnungen"
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            !status ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Alle
        </Link>
        {(Object.keys(STATUS_LABEL) as InvoiceStatus[]).map((s) => (
          <Link
            key={s}
            href={`/admin/finanzen/rechnungen?status=${s}`}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              status === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {invoices.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Keine Rechnungen gefunden.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Nummer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Kunde</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Datum</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Betrag</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <span className="text-sm text-gray-700 font-mono" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {invoice.invoice_number ?? 'Entwurf'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {invoice.client_display_name ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {fmtDate(invoice.invoice_date)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="text-sm text-gray-900 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {fmtEuro(invoice.total_net)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[invoice.status]}`}
                        style={{ fontFamily: 'var(--font-dm-sans)' }}
                      >
                        {STATUS_LABEL[invoice.status]}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/admin/finanzen/rechnungen/${invoice.id}`}
                        className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
                        style={{ fontFamily: 'var(--font-dm-sans)' }}
                      >
                        Details →
                      </Link>
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
