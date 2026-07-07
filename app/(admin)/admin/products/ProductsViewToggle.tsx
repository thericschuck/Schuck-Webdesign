import Link from 'next/link'

export function ProductsViewToggle({ active }: { active: 'products' | 'packages' }) {
  return (
    <div className="inline-flex p-1 bg-gray-100 rounded-xl gap-1 shrink-0" style={{ fontFamily: 'var(--font-dm-sans)' }}>
      <Link
        href="/admin/products"
        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          active === 'products' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Produkte
      </Link>
      <Link
        href="/admin/products/packages"
        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          active === 'packages' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Pakete
      </Link>
    </div>
  )
}
