import Link from 'next/link'
import * as productsDomain from '@/lib/domain/products'
import { ProductsViewToggle } from '../ProductsViewToggle'
import { NewPackageButton } from './NewPackageButton'

function fmtEuro(value: number | null) {
  return value == null ? '—' : `${value.toLocaleString('de-DE')} €`
}

export default async function PackagesPage() {
  const packages = await productsDomain.listPackagesWithSavings()

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Pakete
          </h1>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {packages.length} {packages.length === 1 ? 'Paket' : 'Pakete'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProductsViewToggle active="packages" />
          <NewPackageButton />
        </div>
      </div>

      {packages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Noch keine Pakete importiert.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
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

              <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
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
          ))}
        </div>
      )}
    </div>
  )
}
