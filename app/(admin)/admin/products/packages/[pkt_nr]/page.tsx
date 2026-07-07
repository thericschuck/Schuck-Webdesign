import Link from 'next/link'
import { notFound } from 'next/navigation'
import * as productsDomain from '@/lib/domain/products'
import { PackageEditForm } from './PackageEditForm'
import { PackageItemsEditor } from './PackageItemsEditor'

function fmtEuro(value: number | null) {
  return value == null ? '—' : `${value.toLocaleString('de-DE')} €`
}

const ART_NR_RE = /[A-Z]{2,3}-\d{2,3}(-B)?/g

function extractArtNrCodes(text: string): string[] {
  return [...new Set(text.match(ART_NR_RE) ?? [])]
}

export default async function PackageDetailPage({ params }: { params: Promise<{ pkt_nr: string }> }) {
  const { pkt_nr: pktNr } = await params

  const pkg = await productsDomain.getPackage(pktNr).catch(() => null)
  if (!pkg) notFound()

  const allArticles = await productsDomain.listArticles({ includeInactive: true })
  const usedArtNrs = new Set(pkg.items.map((i) => i.art_nr))
  const availableArticles = allArticles
    .filter((a) => !usedArtNrs.has(a.art_nr))
    .map((a) => ({ art_nr: a.art_nr, bezeichnung: a.bezeichnung }))

  const itemRows = pkg.items.map((item) => {
    const articleInfo = Array.isArray(item.articles) ? item.articles[0] : item.articles
    return {
      art_nr: item.art_nr,
      pos: item.pos,
      menge: item.menge,
      ep: item.ep,
      gesamt: item.gesamt,
      bezeichnung: articleInfo?.bezeichnung ?? '—',
      einheit: articleInfo?.einheit ?? null,
    }
  })

  const folgeproduktCodes = pkg.folgeprodukt ? extractArtNrCodes(pkg.folgeprodukt) : []

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/products" className="hover:text-gray-600 transition-colors">
          Produkte
        </Link>
        <span>/</span>
        <Link href="/admin/products/packages" className="hover:text-gray-600 transition-colors">
          Pakete
        </Link>
        <span>/</span>
        <span className="text-gray-700">{pkg.pkt_nr}</span>
      </nav>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-gray-400 font-mono" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {pkg.pkt_nr}
          </p>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            {pkg.paketname}
          </h1>
          {pkg.zielgruppe && (
            <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {pkg.zielgruppe}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            {fmtEuro(pkg.paketpreis)}
          </p>
          {pkg.laufzeit && (
            <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {pkg.laufzeit}
            </p>
          )}
        </div>
      </div>

      {/* Bearbeiten */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Bearbeiten
        </h2>
        <PackageEditForm pkg={pkg} />
      </div>

      {/* Positionsliste */}
      <PackageItemsEditor pktNr={pkg.pkt_nr} items={itemRows} availableArticles={availableArticles} paketpreis={pkg.paketpreis} />

      {/* Empfohlenes Folgeprodukt */}
      {pkg.folgeprodukt && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Empfohlenes Folgeprodukt
          </h2>
          <p className="text-sm text-gray-600 mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {pkg.folgeprodukt}
          </p>
          {folgeproduktCodes.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {folgeproduktCodes.map((code) => (
                <Link
                  key={code}
                  href={code.startsWith('PKT-') ? `/admin/products/packages/${code}` : `/admin/products/${code}`}
                  className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-mono hover:bg-violet-100 transition-colors"
                >
                  {code}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
