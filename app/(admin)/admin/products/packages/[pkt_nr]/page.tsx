import Link from 'next/link'
import { notFound } from 'next/navigation'
import * as productsDomain from '@/lib/domain/products'

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

  const einzelpreiseSumme = pkg.items.reduce(
    (sum, item) => sum + (item.gesamt ?? (item.ep ?? 0) * (item.menge ?? 1)),
    0
  )
  const hasPriceData = pkg.items.some((i) => i.gesamt != null || i.ep != null)
  const ersparnis = hasPriceData && pkg.paketpreis != null ? einzelpreiseSumme - pkg.paketpreis : null

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

      {/* Positionsliste */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/60">
          <h2 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Positionen
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Pos.</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Art-Nr.</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Bezeichnung</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Menge</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>EP</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Gesamt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pkg.items.map((item) => {
                const articleInfo = Array.isArray(item.articles) ? item.articles[0] : item.articles
                return (
                  <tr key={item.art_nr}>
                    <td className="px-6 py-3 text-sm text-gray-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>{item.pos}</td>
                    <td className="px-6 py-3">
                      <Link href={`/admin/products/${item.art_nr}`} className="text-sm text-violet-600 hover:underline font-mono">
                        {item.art_nr}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {articleInfo?.bezeichnung ?? '—'}
                      {articleInfo?.einheit && (
                        <span className="text-gray-400 font-normal"> · {articleInfo.einheit}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700 text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {item.menge ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700 text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {fmtEuro(item.ep)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900 font-medium text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {fmtEuro(item.gesamt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {hasPriceData && (
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50/60">
                  <td colSpan={5} className="px-6 py-3 text-sm text-gray-600 text-right font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    Summe Einzelpreise
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900 font-semibold text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {fmtEuro(einzelpreiseSumme)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="px-6 py-3 text-sm text-gray-600 text-right font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    Paketpreis
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900 font-semibold text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {fmtEuro(pkg.paketpreis)}
                  </td>
                </tr>
                {ersparnis != null && (
                  <tr>
                    <td colSpan={5} className="px-6 py-3 text-sm text-green-700 text-right font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      Ersparnis
                    </td>
                    <td className="px-6 py-3 text-sm text-green-700 font-semibold text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {fmtEuro(ersparnis)}
                    </td>
                  </tr>
                )}
              </tfoot>
            )}
          </table>
        </div>
      </div>

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
                  href={`/admin/products/${code}`}
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
