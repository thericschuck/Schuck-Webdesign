'use client'

import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { motion, LayoutGroup } from 'framer-motion'

const NAV_LINKS = [
  { href: '/portal',           label: 'Dashboard' },
  { href: '/portal/project',   label: 'Meine Projekte' },
  { href: '/portal/documents', label: 'Dokumente' },
  { href: '/portal/bewertung', label: 'Bewertung' },
  { href: '/portal/settings',  label: 'Einstellungen' },
]

/**
 * Kleiner Punkt, solange die angeklickte Route noch lädt. `useLinkStatus()` funktioniert
 * nur INNERHALB eines <Link>, deshalb die eigene Komponente. Absolut positioniert, damit
 * beim Erscheinen nichts verrutscht — der Klick soll sich sofort quittiert anfühlen,
 * nicht das Layout verschieben.
 */
function NavPendingDot({ className }: { className: string }) {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute h-1.5 w-1.5 animate-ping rounded-full bg-[#7F77DD] ${className}`}
    />
  )
}

interface PortalNavProps {
  fullName: string | null
  email: string
}

export function PortalNav({ fullName, email }: PortalNavProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const displayName = fullName || email

  return (
    <header
      className="sticky top-0 z-30 border-b border-white/8 bg-[#080808]/92"
      style={{
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/portal" className="flex flex-col leading-none text-[#F5F5F0]">
            <span className="text-sm tracking-tight" style={{ fontFamily: 'var(--font-fraunces)' }}>
              [ Schuck ]
            </span>
            <span
              className="mt-1 text-[9px] uppercase tracking-[0.22em] text-white/28"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Webdesign
            </span>
          </Link>

          {/* Desktop Nav — gleitende Pill */}
          <LayoutGroup id="portal-nav">
            <nav className="hidden md:flex items-center gap-1 rounded-full border border-white/8 bg-white/3 px-2 py-1">
              {NAV_LINKS.map((link) => {
                const active =
                  pathname === link.href ||
                  (link.href !== '/portal' && pathname.startsWith(link.href))
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="relative px-4 py-2 rounded-full text-sm transition-colors duration-150"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-[#F5F5F0]"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span
                      className={[
                        'relative z-10 transition-colors duration-150',
                        active ? 'text-[#080808] font-medium' : 'text-white/50 hover:text-white',
                      ].join(' ')}
                    >
                      {link.label}
                    </span>
                    <NavPendingDot className="right-1.5 top-1.5 z-10" />
                  </Link>
                )
              })}
            </nav>
          </LayoutGroup>

          {/* User + Logout */}
          <div className="hidden md:flex items-center gap-3">
            <span
              className="text-xs text-white/40 max-w-35 truncate"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {displayName}
            </span>
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                className="text-xs text-white/40 hover:text-white/80 transition-colors"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                Abmelden
              </button>
            </form>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-white/50 hover:text-white transition-colors"
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
        <div className="md:hidden border-t border-white/8 bg-[#080808] px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== '/portal' && pathname.startsWith(link.href))
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={[
                  'relative px-3 py-2.5 rounded-xl text-sm transition-colors',
                  active
                    ? 'bg-[#F5F5F0] text-[#080808] font-medium'
                    : 'text-white/50 hover:text-white hover:bg-white/5',
                ].join(' ')}
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {link.label}
                <NavPendingDot className="right-3 top-1/2 -translate-y-1/2" />
              </Link>
            )
          })}
          <div className="mt-2 pt-2.5 border-t border-white/8 flex items-center justify-between">
            <span className="text-xs text-white/30 truncate max-w-50">{displayName}</span>
            <form action="/auth/logout" method="POST">
              <button type="submit" className="text-xs text-white/40 hover:text-white/80 transition-colors">
                Abmelden
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}
