'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/jarvis', label: 'Chat' },
  { href: '/admin/jarvis/cockpit', label: 'Cockpit' },
]

export default function JarvisLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
      {children}
    </div>
  )
}
