'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/helm', label: 'Chat' },
  { href: '/admin/helm/cockpit', label: 'Agenten' },
  { href: '/admin/helm/functions', label: 'Funktionen' },
  { href: '/admin/helm/automations', label: 'Automationen' },
]

/** Gemeinsamer 4-Tab-Umschalter für alle HELM-Vollbild-Flächen (Chat, Cockpit,
 * Funktionen-Katalog, Automationen) — eine Definition statt vier Kopien der Tab-Liste. */
export function HelmTabs({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <div className={`flex gap-1 p-1 rounded-lg bg-white/5 border border-white/8 ${className ?? ''}`}>
      {TABS.map((tab) => {
        const active = tab.href === '/admin/helm' ? pathname === tab.href : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              active ? 'bg-[#7F77DD] text-white' : 'text-white/50 hover:text-white'
            }`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
