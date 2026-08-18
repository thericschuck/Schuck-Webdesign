'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { PriceInlineEdit } from './PriceInlineEdit'
import { ActiveToggle } from './ActiveToggle'
import { KATEGORIE_ORDER, kategorieChip } from './category-constants'
import type { ArticleRow } from './types'

const ALL_KEY = '__all__'
const UNCATEGORIZED = 'Ohne Kategorie'

function matchesQuery(article: ArticleRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return article.bezeichnung.toLowerCase().includes(q) || article.art_nr.toLowerCase().includes(q)
}

// ── Tabelle (eine Kategorie oder die geflachte "Alle"-Ansicht) ──────────────

function ArticleTableRow({
  article,
  bezeichnungByArtNr,
  showCategoryChip,
}: {
  article: ArticleRow
  bezeichnungByArtNr: Map<string, string>
  showCategoryChip: boolean
}) {
  const chip = kategorieChip(article.kategorie ?? UNCATEGORIZED)
  return (
    <tr className={`hover:bg-gray-50 transition-colors ${!article.aktiv ? 'opacity-50' : ''}`}>
      <td className="px-6 py-3">
        <div className="flex items-center gap-3">
          {showCategoryChip && (
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0 ${chip.bg} ${chip.text}`}
              style={{ fontFamily: 'var(--font-dm-sans)' }}
              title={article.kategorie ?? UNCATEGORIZED}
            >
              {chip.code}
            </span>
          )}
          <div className="min-w-0">
            <Link
              href={`/admin/products/${article.art_nr}`}
              className="text-sm font-medium text-gray-900 hover:text-violet-700 transition-colors block truncate"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {article.bezeichnung}
            </Link>
            <span className="text-xs text-gray-400 font-mono" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {article.art_nr}
            </span>
          </div>
        </div>
      </td>
      <td className="px-6 py-3 whitespace-nowrap">
        <PriceInlineEdit artNr={article.art_nr} preisMin={article.preis_min} preisMax={article.preis_max} einheit={article.einheit} />
      </td>
      <td className="px-6 py-3 whitespace-nowrap">
        <span className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {article.einheit ?? '—'}
        </span>
      </td>
      <td className="px-6 py-3 whitespace-nowrap">
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            article.typ === 'Monatlich' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {article.typ ?? '—'}
        </span>
      </td>
      <td className="px-6 py-3 whitespace-nowrap">
        {article.pflichtbetrieb_art_nr ? (
          <Link
            href={`/admin/products/${article.pflichtbetrieb_art_nr}`}
            className="text-xs text-violet-600 hover:underline"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {article.pflichtbetrieb_art_nr}
            {bezeichnungByArtNr.get(article.pflichtbetrieb_art_nr) ? ` · ${bezeichnungByArtNr.get(article.pflichtbetrieb_art_nr)}` : ''}
          </Link>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>
      <td className="px-6 py-3 whitespace-nowrap">
        <ActiveToggle artNr={article.art_nr} aktiv={article.aktiv} />
      </td>
      <td className="px-6 py-3 text-right whitespace-nowrap">
        <Link
          href={`/admin/products/${article.art_nr}`}
          className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Details →
        </Link>
      </td>
    </tr>
  )
}

function ArticleTable({
  articles,
  bezeichnungByArtNr,
  showCategoryChip,
}: {
  articles: ArticleRow[]
  bezeichnungByArtNr: Map<string, string>
  showCategoryChip: boolean
}) {
  const TH_CLASS =
    'sticky top-0 z-10 bg-white px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* max-h zeigt ~5 Zeilen, Rest scrollt innerhalb der Kachel — bei vielen Artikeln
          (z.B. "Alle Kategorien") wird die Seite dadurch nicht beliebig lang. Kopfzeile
          bleibt beim vertikalen Scrollen sichtbar (sticky); whitespace-nowrap verhindert,
          dass Spalten wie "Pflichtbetrieb" umbrechen und dadurch abgeschnitten wirken —
          stattdessen scrollt die Tabelle bei Bedarf sauber horizontal. */}
      <div className="max-h-105 overflow-auto custom-scrollbar">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className={TH_CLASS} style={{ fontFamily: 'var(--font-dm-sans)' }}>Artikel</th>
              <th className={TH_CLASS} style={{ fontFamily: 'var(--font-dm-sans)' }}>Preisspanne</th>
              <th className={TH_CLASS} style={{ fontFamily: 'var(--font-dm-sans)' }}>Einheit</th>
              <th className={TH_CLASS} style={{ fontFamily: 'var(--font-dm-sans)' }}>Typ</th>
              <th className={TH_CLASS} style={{ fontFamily: 'var(--font-dm-sans)' }}>Pflichtbetrieb</th>
              <th className={TH_CLASS} style={{ fontFamily: 'var(--font-dm-sans)' }}>Status</th>
              <th className={TH_CLASS} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {articles.map((article) => (
              <ArticleTableRow key={article.art_nr} article={article} bezeichnungByArtNr={bezeichnungByArtNr} showCategoryChip={showCategoryChip} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Kategorie-Leiste ─────────────────────────────────────────────────────────

function RailItem({ active, onClick, title, count }: { active: boolean; onClick: () => void; title: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 rounded-xl border transition-colors flex items-center gap-2.5 ${
        active ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-100 text-gray-700 hover:border-gray-300'
      }`}
    >
      <span
        className={`text-sm font-medium truncate flex-1 ${active ? 'text-white' : 'text-gray-800'}`}
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        {title}
      </span>
      <span
        className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full ${active ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-600'}`}
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        {count}
      </span>
    </button>
  )
}

// ── Board ─────────────────────────────────────────────────────────────────────

export function ProductsBoard({ articles }: { articles: ArticleRow[] }) {
  const [activeKey, setActiveKey] = useState<string>(ALL_KEY)
  const [query, setQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Pflichtbetrieb-Links sollen auch dann auflösen, wenn das Zielprodukt gerade
  // aus- oder weggefiltert ist — deshalb aus ALLEN Artikeln, nicht der Ansicht.
  const bezeichnungByArtNr = useMemo(() => new Map(articles.map((a) => [a.art_nr, a.bezeichnung])), [articles])

  const visible = useMemo(
    () => articles.filter((a) => (showInactive || a.aktiv) && matchesQuery(a, query)),
    [articles, showInactive, query]
  )

  const byKategorie = useMemo(() => {
    const map = new Map<string, ArticleRow[]>()
    for (const article of visible) {
      const key = article.kategorie ?? UNCATEGORIZED
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(article)
    }
    return map
  }, [visible])

  const categoryOrder = useMemo(
    () => [...KATEGORIE_ORDER, ...[...byKategorie.keys()].filter((k) => !KATEGORIE_ORDER.includes(k))].filter((k) => byKategorie.has(k)),
    [byKategorie]
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Suche + Inaktive-Toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-50">
          <svg className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Art-Nr. oder Bezeichnung suchen…"
            className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Inaktive anzeigen
        </label>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Kategorie-Leiste — jede Kategorie einen Klick entfernt, kein Scrollen durch die anderen */}
        <nav
          className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible custom-scrollbar pb-1 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0 lg:w-56 lg:shrink-0 lg:sticky lg:top-8"
          aria-label="Kategorien"
        >
          <RailItem active={activeKey === ALL_KEY} onClick={() => setActiveKey(ALL_KEY)} title="Alle Kategorien" count={visible.length} />
          {categoryOrder.map((kategorie) => (
            <RailItem
              key={kategorie}
              active={activeKey === kategorie}
              onClick={() => setActiveKey(kategorie)}
              title={kategorie}
              count={byKategorie.get(kategorie)?.length ?? 0}
            />
          ))}
        </nav>

        {/* Tabelle */}
        <div className="flex-1 min-w-0">
          {(() => {
            const currentArticles = activeKey === ALL_KEY ? visible : byKategorie.get(activeKey) ?? []
            if (currentArticles.length === 0) {
              return (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
                  <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    Keine Artikel gefunden.
                  </p>
                </div>
              )
            }
            return <ArticleTable articles={currentArticles} bezeichnungByArtNr={bezeichnungByArtNr} showCategoryChip={activeKey === ALL_KEY} />
          })()}
        </div>
      </div>
    </div>
  )
}
