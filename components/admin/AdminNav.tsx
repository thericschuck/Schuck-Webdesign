'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/admin/clients',
    label: 'Kunden',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/projects',
    label: 'Projekte',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
]

export function AdminNav({ adminName, unreadMessages = 0 }: { adminName: string | null; unreadMessages?: number }) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/admin/dashboard'
      ? pathname === href
      : pathname.startsWith(href)

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-[#111111] border-r border-white/6 flex flex-col z-40">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-white/6">
        <span
          className="text-white font-bold text-lg leading-tight"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          Schuck
          <br />
          <span className="text-white/40 font-normal text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Backoffice
          </span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              isActive(item.href)
                ? 'bg-white/10 text-white'
                : 'text-white/45 hover:text-white/80 hover:bg-white/5'
            }`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            <span className={isActive(item.href) ? 'text-white' : 'text-white/40'}>
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.href === '/admin/projects' && unreadMessages > 0 && (
              <span className="text-xs bg-red-500 text-white font-medium px-1.5 py-0.5 rounded-full leading-none min-w-4.5 text-center">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </Link>
        ))}

        {/* Divider + Quick action */}
        <div className="mt-3 pt-3 border-t border-white/6">
          <Link
            href="/admin/clients/new"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              pathname === '/admin/clients/new'
                ? 'bg-white/10 text-white'
                : 'text-white/45 hover:text-white/80 hover:bg-white/5'
            }`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            <span className={pathname === '/admin/clients/new' ? 'text-white' : 'text-white/40'}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </span>
            Neuer Kunde
          </Link>
        </div>
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/6">
        <div className="px-3 py-2 mb-1">
          <p className="text-white/70 text-sm truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {adminName ?? 'Admin'}
          </p>
          <p className="text-white/25 text-xs" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Administrator
          </p>
        </div>
        <form action="/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors text-left"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Abmelden
          </button>
        </form>
      </div>
    </aside>
  )
}
