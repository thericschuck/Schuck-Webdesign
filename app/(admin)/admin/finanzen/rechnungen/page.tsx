import Link from 'next/link'
import * as financeDomain from '@/lib/domain/finance'
import { InvoicesBoard } from './InvoicesBoard'
import { FinanzenTabs } from '../FinanzenTabs'

export default async function InvoicesPage() {
  // Alles auf einmal laden (inkl. Testrechnungen) — Status-/Test-Filter und Suche laufen
  // clientseitig im Board, kein Server-Roundtrip pro Filterklick mehr nötig.
  const invoices = await financeDomain.listInvoices({ includeTest: true })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Rechnungen
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/finanzen/rechnungen/nachtragen"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Rechnung nachtragen
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

      <FinanzenTabs />

      <InvoicesBoard invoices={invoices} />
    </div>
  )
}
