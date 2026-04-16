'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV_LINKS = [
  { href: '/portal',            label: 'Dashboard' },
  { href: '/portal/project',    label: 'Mein Projekt' },
  { href: '/portal/documents',  label: 'Dokumente' },
  { href: '/portal/upload',     label: 'Dateien hochladen' },
  { href: '/portal/settings',   label: 'Einstellungen' },
]

interface PortalNavProps {
  fullName: string | null
  email: string
}

export function PortalNav({ fullName, email }: PortalNavProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const displayName = fullName || email

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/portal" className="text-sm font-semibold tracking-tight">
            Schuck Webdesign
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    'px-3 py-1.5 rounded-md text-sm transition-colors',
                    active
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* User + Logout */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-xs text-gray-500 max-w-35 truncate">{displayName}</span>
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                Abmelden
              </button>
            </form>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-900"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menü"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={[
                  'px-3 py-2 rounded-md text-sm',
                  active
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50',
                ].join(' ')}
              >
                {link.label}
              </Link>
            )
          })}
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400 truncate max-w-50">{displayName}</span>
            <form action="/auth/logout" method="POST">
              <button type="submit" className="text-xs text-gray-400 hover:text-gray-700">
                Abmelden
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}
