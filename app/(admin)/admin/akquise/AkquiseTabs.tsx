'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/akquise', label: 'Übersicht' },
  { href: '/admin/akquise/tracking', label: 'Tracking' },
  { href: '/admin/akquise/stats', label: 'Statistik' },
]

export function AkquiseTabs() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1 border-b border-gray-100" aria-label="Akquise-Bereiche">
      {TABS.map((tab) => {
        const active = tab.href === '/admin/akquise' ? pathname === tab.href : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative px-3.5 py-2.5 text-sm font-medium transition-colors ${
              active ? 'text-gray-900' : 'text-gray-400 hover:text-gray-700'
            }`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {tab.label}
            {active && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-gray-900 rounded-full" />}
          </Link>
        )
      })}
    </nav>
  )
}
