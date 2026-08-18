import * as productsDomain from '@/lib/domain/products'
import { ProductsViewToggle } from '../ProductsViewToggle'
import { NewPackageButton } from './NewPackageButton'
import { PackagesBoard } from './PackagesBoard'

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

export default async function PackagesPage() {
  const packages = await productsDomain.listPackagesWithSavings()

  const totalItems = packages.reduce((sum, pkg) => sum + pkg.items.length, 0)
  const withSavings = packages.filter((pkg) => pkg.ersparnis != null && pkg.ersparnis > 0).length

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

      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <StatTile label="Pakete" value={packages.length} dotColor="bg-gray-900" />
        <StatTile label="Positionen insgesamt" value={totalItems} dotColor="bg-violet-500" />
        <StatTile label="Mit Ersparnis" value={withSavings} dotColor="bg-green-500" />
      </div>

      {packages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Noch keine Pakete importiert.
          </p>
        </div>
      ) : (
        <PackagesBoard packages={packages} />
      )}
    </div>
  )
}
