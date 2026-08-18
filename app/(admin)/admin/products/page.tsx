import * as productsDomain from '@/lib/domain/products'
import * as countersDomain from '@/lib/domain/counters'
import { ProductsViewToggle } from './ProductsViewToggle'
import { NewArticleButton } from './NewArticleButton'
import { ProductsBoard } from './ProductsBoard'
import { InfoTooltip } from '@/components/admin/InfoTooltip'
import type { ArticleRow } from './types'

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

export default async function ProductsPage() {
  // Alles auf einmal laden (inkl. inaktiv) — Kategorie/Suche/Inaktive-Filter laufen
  // clientseitig im Board, kein Server-Roundtrip pro Filteränderung mehr nötig.
  const [articles, counters] = await Promise.all([
    productsDomain.listArticles({ includeInactive: true }) as Promise<ArticleRow[]>,
    countersDomain.listCounters(),
  ])

  const activeCount = articles.filter((a) => a.aktiv).length
  const inactiveCount = articles.length - activeCount
  const kategorienCount = new Set(articles.map((a) => a.kategorie ?? 'Ohne Kategorie')).size

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Produkte
          </h1>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {articles.length} {articles.length === 1 ? 'Artikel' : 'Artikel'} insgesamt
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProductsViewToggle active="products" />
          <NewArticleButton />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <StatTile label="Artikel" value={articles.length} dotColor="bg-gray-900" />
        <StatTile label="Aktiv" value={activeCount} dotColor="bg-green-500" />
        {inactiveCount > 0 && <StatTile label="Inaktiv" value={inactiveCount} dotColor="bg-gray-300" />}
        <StatTile label="Kategorien" value={kategorienCount} dotColor="bg-violet-500" />
      </div>

      {/* Suche + Kategorie-Leiste + Tabelle */}
      {articles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Keine Artikel gefunden.
          </p>
        </div>
      ) : (
        <ProductsBoard articles={articles} />
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
                <span className="absolute top-2 right-2">
                  <InfoTooltip text={counter.info} />
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
