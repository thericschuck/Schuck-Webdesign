'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { InvoiceStatus } from '@/types/database'
import type { InvoiceRow } from './types'

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

type SortKey = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'

const SORTERS: Record<SortKey, (a: InvoiceRow, b: InvoiceRow) => number> = {
  date_desc: (a, b) => (b.invoice_date ?? '').localeCompare(a.invoice_date ?? ''),
  date_asc: (a, b) => (a.invoice_date ?? '').localeCompare(b.invoice_date ?? ''),
  amount_desc: (a, b) => (b.total_net ?? 0) - (a.total_net ?? 0),
  amount_asc: (a, b) => (a.total_net ?? 0) - (b.total_net ?? 0),
}

export function InvoicesBoard({ invoices }: { invoices: InvoiceRow[] }) {
  const [status, setStatus] = useState<InvoiceStatus | null>(null)
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showTest, setShowTest] = useState(false)
  const [sort, setSort] = useState<SortKey>('date_desc')

  const testCount = useMemo(() => invoices.filter((i) => i.is_test).length, [invoices])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return invoices
      .filter((i) => showTest || !i.is_test)
      .filter((i) => !status || i.status === status)
      .filter((i) => !fromDate || (i.invoice_date ?? '') >= fromDate)
      .filter((i) => !toDate || (i.invoice_date ?? '') <= toDate)
      .filter((i) => !q || i.invoice_number?.toLowerCase().includes(q) || i.client_display_name?.toLowerCase().includes(q))
      .sort(SORTERS[sort])
  }, [invoices, status, search, fromDate, toDate, showTest, sort])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-gray-500 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        {filtered.length} {filtered.length === 1 ? 'Rechnung' : 'Rechnungen'}
      </p>

      {/* Suche + Zeitraum + Sortierung */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suche nach Nummer oder Kunde…"
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 min-w-[220px]"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        />
        <span className="text-gray-400 text-sm">bis</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          <option value="date_desc">Datum ↓ (neueste zuerst)</option>
          <option value="date_asc">Datum ↑ (älteste zuerst)</option>
          <option value="amount_desc">Betrag ↓</option>
          <option value="amount_asc">Betrag ↑</option>
        </select>
      </div>

      {/* Statusfilter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setStatus(null)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            !status ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Alle
        </button>
        {(Object.keys(STATUS_LABEL) as InvoiceStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              status === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
        {testCount > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-gray-500 ml-2 cursor-pointer" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            <input type="checkbox" checked={showTest} onChange={(e) => setShowTest(e.target.checked)} className="rounded border-gray-300" />
            Testrechnungen anzeigen ({testCount})
          </label>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
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
              <tbody className="divide-y divide-gray-100">
                {filtered.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 font-mono" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {invoice.invoice_number ?? 'Entwurf'}
                        </span>
                        {invoice.is_test && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                            TEST
                          </span>
                        )}
                        {invoice.is_backfilled && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-purple-50 text-purple-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                            Nachgetragen
                          </span>
                        )}
                      </div>
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
