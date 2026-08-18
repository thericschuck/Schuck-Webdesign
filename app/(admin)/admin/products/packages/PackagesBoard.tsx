'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { PackageWithSavings } from '@/lib/domain/products'

function fmtEuro(value: number | null) {
  return value == null ? '—' : `${value.toLocaleString('de-DE')} €`
}

function matchesQuery(pkg: PackageWithSavings, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (pkg.pkt_nr.toLowerCase().includes(q)) return true
  if (pkg.paketname.toLowerCase().includes(q)) return true
  if (pkg.zielgruppe?.toLowerCase().includes(q)) return true
  return pkg.items.some((item) => item.art_nr.toLowerCase().includes(q) || item.bezeichnung.toLowerCase().includes(q))
}

function matchingItems(pkg: PackageWithSavings, query: string): PackageWithSavings['items'] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  // Nur Treffer zeigen, die NICHT schon über Paketname/Zielgruppe/Nummer erklärt sind —
  // sonst würde bei jeder Suche irreführend "Treffer in Positionen" für alle Karten stehen.
  if (pkg.pkt_nr.toLowerCase().includes(q) || pkg.paketname.toLowerCase().includes(q) || pkg.zielgruppe?.toLowerCase().includes(q)) return []
  return pkg.items.filter((item) => item.art_nr.toLowerCase().includes(q) || item.bezeichnung.toLowerCase().includes(q))
}

export function PackagesBoard({ packages }: { packages: PackageWithSavings[] }) {
  const [query, setQuery] = useState('')

  const visible = useMemo(() => packages.filter((pkg) => matchesQuery(pkg, query)), [packages, query])

  return (
    <div className="flex flex-col gap-4">
      {/* Suche */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-50">
          <svg className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Paket, Zielgruppe oder enthaltenes Produkt suchen…"
            className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          />
        </div>
        <span className="text-xs text-gray-400 shrink-0" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {visible.length} Treffer
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Keine Pakete gefunden.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((pkg) => {
            const hits = matchingItems(pkg, query)
            return (
              <Link
                key={pkg.pkt_nr}
                href={`/admin/products/packages/${pkg.pkt_nr}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:border-gray-200 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-gray-400 font-mono" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {pkg.pkt_nr}
                    </p>
                    <h2 className="text-base font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {pkg.paketname}
                    </h2>
                  </div>
                  <p className="text-lg font-bold text-gray-900 shrink-0" style={{ fontFamily: 'var(--font-playfair)' }}>
                    {fmtEuro(pkg.paketpreis)}
                  </p>
                </div>

                {pkg.zielgruppe && (
                  <p className="text-sm text-gray-500 line-clamp-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {pkg.zielgruppe}
                  </p>
                )}

                {hits.length > 0 && (
                  <div className="rounded-lg bg-violet-50 px-2.5 py-2 flex flex-col gap-1">
                    <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      Treffer in Positionen
                    </p>
                    {hits.map((item) => (
                      <p key={item.art_nr} className="text-xs text-violet-700 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {item.art_nr} · {item.bezeichnung}
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {pkg.items.length} {pkg.items.length === 1 ? 'Position' : 'Positionen'}
                  </span>
                  {pkg.laufzeit && (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {pkg.laufzeit}
                    </span>
                  )}
                  {pkg.ersparnis != null && pkg.ersparnis > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      Ersparnis {fmtEuro(pkg.ersparnis)}
                      {pkg.einzelpreise_summe ? ` (${Math.round((pkg.ersparnis / pkg.einzelpreise_summe) * 100)}%)` : ''}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
