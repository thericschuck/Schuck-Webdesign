import Link from 'next/link'
import { notFound } from 'next/navigation'
import * as productsDomain from '@/lib/domain/products'
import { ArticleEditForm } from './ArticleEditForm'

export default async function ArticleDetailPage({ params }: { params: Promise<{ art_nr: string }> }) {
  const { art_nr: artNr } = await params

  const article = await productsDomain.getArticle(artNr).catch(() => null)
  if (!article) notFound()

  const [allArticles, usedInPackages] = await Promise.all([
    productsDomain.listArticles({ includeInactive: true }),
    productsDomain.listPackagesForArticle(artNr),
  ])

  const otherArticles = allArticles.filter((a) => a.art_nr !== artNr)

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/products" className="hover:text-gray-600 transition-colors">
          Produkte
        </Link>
        <span>/</span>
        <span className="text-gray-700">{article.art_nr}</span>
      </nav>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            {article.bezeichnung}
          </h1>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              article.aktiv ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {article.aktiv ? 'Aktiv' : 'Inaktiv'}
          </span>
        </div>
        <p className="text-gray-500 text-sm mt-1 font-mono" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {article.art_nr}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <ArticleEditForm article={article} otherArticles={otherArticles} />
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Enthalten in Paketen
            </h2>
            {usedInPackages.length === 0 ? (
              <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Dieser Artikel ist in keinem Paket enthalten.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {usedInPackages.map((pkg) => (
                  <Link
                    key={pkg.pkt_nr}
                    href={`/admin/products/packages/${pkg.pkt_nr}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {pkg.paketname}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{pkg.pkt_nr}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
