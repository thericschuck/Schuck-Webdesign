import Link from 'next/link'
import * as productsDomain from '@/lib/domain/products'
import * as countersDomain from '@/lib/domain/counters'
import { PriceInlineEdit } from './PriceInlineEdit'
import { ActiveToggle } from './ActiveToggle'
import { KATEGORIE_ORDER, kategorieChip } from './category-constants'
import type { Article } from '@/types/database'

type ArticleRow = Pick<
  Article,
  'art_nr' | 'bezeichnung' | 'preis_min' | 'preis_max' | 'einheit' | 'typ' | 'kategorie' | 'pflichtbetrieb_art_nr' | 'aktiv'
>

interface SearchParams {
  q?: string
  kategorie?: string
  inaktive?: string
}

function StatTile({ label, value, dotColor }: { label: string; value: number; dotColor: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-2.5">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <span className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        {value} {label}
      </span>
    </div>
  )
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams

  const [articles, counters] = await Promise.all([
    productsDomain.listArticles({
      search: sp.q || undefined,
      kategorie: sp.kategorie || undefined,
      includeInactive: sp.inaktive === '1',
    }) as Promise<ArticleRow[]>,
    countersDomain.listCounters(),
  ])

  const bezeichnungByArtNr = new Map(articles.map((a) => [a.art_nr, a.bezeichnung]))

  const byKategorie = new Map<string, ArticleRow[]>()
  for (const article of articles) {
    const key = article.kategorie ?? 'Ohne Kategorie'
    if (!byKategorie.has(key)) byKategorie.set(key, [])
    byKategorie.get(key)!.push(article)
  }

  const groupOrder = sp.kategorie
    ? [sp.kategorie]
    : [...KATEGORIE_ORDER, ...[...byKategorie.keys()].filter((k) => !KATEGORIE_ORDER.includes(k))]

  const hasFilters = !!(sp.q || sp.kategorie || sp.inaktive)
  const activeCount = articles.filter((a) => a.aktiv).length
  const inactiveCount = articles.length - activeCount

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Produkte
          </h1>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {articles.length} {articles.length === 1 ? 'Artikel' : 'Artikel'}
            {hasFilters ? ' (gefiltert)' : ' insgesamt'}
          </p>
        </div>
        <Link
          href="/admin/products/packages"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Pakete →
        </Link>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <StatTile label="Artikel" value={articles.length} dotColor="bg-gray-900" />
        <StatTile label="Aktiv" value={activeCount} dotColor="bg-green-500" />
        {inactiveCount > 0 && <StatTile label="Inaktiv" value={inactiveCount} dotColor="bg-gray-300" />}
        <StatTile label="Kategorien" value={byKategorie.size} dotColor="bg-violet-500" />
      </div>

      {/* Filterleiste */}
      <form
        method="GET"
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3"
      >
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Art-Nr. oder Bezeichnung suchen…"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white flex-1 min-w-50"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        />
        <select
          name="kategorie"
          defaultValue={sp.kategorie ?? ''}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          <option value="">Alle Kategorien</option>
          {KATEGORIE_ORDER.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          <input type="checkbox" name="inaktive" value="1" defaultChecked={sp.inaktive === '1'} />
          Inaktive anzeigen
        </label>
        <button
          type="submit"
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Filtern
        </button>
        {hasFilters && (
          <Link
            href="/admin/products"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Zurücksetzen
          </Link>
        )}
      </form>

      {/* Kategorien-Gruppen */}
      {articles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Keine Artikel gefunden.
          </p>
        </div>
      ) : (
        groupOrder.map((kategorie) => {
          const groupArticles = byKategorie.get(kategorie)
          if (!groupArticles || groupArticles.length === 0) return null
          const chip = kategorieChip(kategorie)

          return (
            <div key={kategorie} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${chip.bg} ${chip.text}`}
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  {chip.code}
                </span>
                <h2 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {kategorie} <span className="text-gray-400 font-normal">({groupArticles.length})</span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Artikel</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Preisspanne</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Einheit</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Typ</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Pflichtbetrieb</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Status</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {groupArticles.map((article) => (
                      <tr key={article.art_nr} className={`hover:bg-gray-50 transition-colors ${!article.aktiv ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0 ${chip.bg} ${chip.text}`}
                              style={{ fontFamily: 'var(--font-dm-sans)' }}
                            >
                              {chip.code}
                            </span>
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
                        <td className="px-6 py-3">
                          <PriceInlineEdit
                            artNr={article.art_nr}
                            preisMin={article.preis_min}
                            preisMax={article.preis_max}
                            einheit={article.einheit}
                          />
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                            {article.einheit ?? '—'}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              article.typ === 'Monatlich' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                            }`}
                            style={{ fontFamily: 'var(--font-dm-sans)' }}
                          >
                            {article.typ ?? '—'}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          {article.pflichtbetrieb_art_nr ? (
                            <Link
                              href={`/admin/products/${article.pflichtbetrieb_art_nr}`}
                              className="text-xs text-violet-600 hover:underline"
                              style={{ fontFamily: 'var(--font-dm-sans)' }}
                            >
                              {article.pflichtbetrieb_art_nr}
                              {bezeichnungByArtNr.get(article.pflichtbetrieb_art_nr)
                                ? ` · ${bezeichnungByArtNr.get(article.pflichtbetrieb_art_nr)}`
                                : ''}
                            </Link>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <ActiveToggle artNr={article.art_nr} aktiv={article.aktiv} />
                        </td>
                        <td className="px-6 py-3 text-right">
                          <Link
                            href={`/admin/products/${article.art_nr}`}
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
            </div>
          )
        })
      )}

      {/* Nummernkreise */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Nummernkreise
        </h2>
        <p className="text-xs text-gray-400 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Zuletzt vergebene und nächste Nummer je Zähler.
        </p>
        {counters.length === 0 ? (
          <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Noch keine Nummern vergeben.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {counters.map((counter) => (
              <div key={counter.key} className="relative rounded-xl border border-gray-100 p-3">
                <span
                  className="absolute top-2 right-2 w-4 h-4 rounded-full bg-gray-100 text-gray-400 text-[10px] font-semibold flex items-center justify-center cursor-help"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                  title={counter.info}
                >
                  i
                </span>
                <p className="text-xs text-gray-400 truncate pr-5" style={{ fontFamily: 'var(--font-dm-sans)' }} title={counter.label}>
                  {counter.label}
                </p>
                <p className="text-sm font-mono font-semibold text-gray-900 mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {counter.primary}
                </p>
                {counter.secondary && (
                  <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {counter.secondary}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
