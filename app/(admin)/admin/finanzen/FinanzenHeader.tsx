'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Kopfzeile des Finanzen-Bereichs: Titel, Neu-Menü, Einstellungen, Tabs.
 *
 * Nur noch zwei Tabs — Übersicht (Zahlen) und Belege (die tägliche Arbeit).
 * Firmenstammdaten und Dokumentvorlage sind Konfiguration, die man einmal
 * setzt; sie liegen deshalb hinter dem Zahnrad statt gleichrangig in der
 * Tab-Leiste. Der Primärbutton wandert nicht mehr je Tab, sondern steht als
 * Menü fest oben rechts.
 */

const FONT = { fontFamily: 'var(--font-dm-sans)' } as const

const TABS = [
  { href: '/admin/finanzen', label: 'Übersicht' },
  { href: '/admin/finanzen/belege', label: 'Belege' },
]

/** Detailrouten zählen zum Belege-Tab, damit die Markierung beim Öffnen eines
 * Dokuments nicht verschwindet. */
const BELEG_PFADE = ['/admin/finanzen/belege', '/admin/finanzen/rechnungen', '/admin/finanzen/angebote']

function NeuMenu() {
  const [offen, setOffen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!offen) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOffen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [offen])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
        style={FONT}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Neu
        <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {offen && (
        <div className="absolute right-0 z-30 mt-1.5 w-56 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <Link
            href="/admin/finanzen/angebote/new"
            onClick={() => setOffen(false)}
            className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            style={FONT}
          >
            Angebot
          </Link>
          <Link
            href="/admin/finanzen/rechnungen/new"
            onClick={() => setOffen(false)}
            className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
            style={FONT}
          >
            Rechnung
          </Link>
          <Link
            href="/admin/finanzen/rechnungen/nachtragen"
            onClick={() => setOffen(false)}
            className="block px-4 py-2.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors border-t border-gray-100"
            style={FONT}
          >
            Bestehende Rechnung nachtragen
          </Link>
        </div>
      )}
    </div>
  )
}

export function FinanzenHeader({ untertitel }: { untertitel?: string }) {
  const pathname = usePathname()
  const einstellungenAktiv = pathname.startsWith('/admin/finanzen/einstellungen')

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Finanzen
          </h1>
          {untertitel && (
            <p className="text-gray-500 text-sm mt-1" style={FONT}>
              {untertitel}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <NeuMenu />
          <Link
            href="/admin/finanzen/einstellungen"
            aria-label="Einstellungen und Vorlage"
            title="Einstellungen und Vorlage"
            className={`p-2.5 rounded-xl border transition-colors ${
              einstellungenAktiv
                ? 'border-gray-300 bg-gray-100 text-gray-900'
                : 'border-gray-200 bg-white text-gray-400 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </div>

      <nav className="flex items-center gap-6 border-b border-gray-200" aria-label="Finanzen-Bereiche">
        {TABS.map((tab) => {
          const aktiv =
            tab.href === '/admin/finanzen'
              ? pathname === tab.href
              : BELEG_PFADE.some((p) => pathname.startsWith(p))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={aktiv ? 'page' : undefined}
              className={`relative -mb-px pb-2.5 text-sm font-medium transition-colors ${
                aktiv ? 'text-gray-900' : 'text-gray-400 hover:text-gray-700'
              }`}
              style={FONT}
            >
              {tab.label}
              {aktiv && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gray-900 rounded-full" />}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
