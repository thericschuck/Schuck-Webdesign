'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ClientStatus } from '@/types/database'

export interface ClientRow {
  id: string
  number: string | null
  displayName: string
  companyName: string | null
  hasPortalAccess: boolean
  email: string | null
  projectCount: number
  status: ClientStatus
}

const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  lead: 'Lead',
  pending: 'Ausstehend',
  active: 'Aktiv',
  paused: 'Pausiert',
  completed: 'Abgeschlossen',
  inactive: 'Inaktiv',
}

const CLIENT_STATUS_COLOR: Record<ClientStatus, string> = {
  lead: 'bg-purple-50 text-purple-700',
  pending: 'bg-amber-50 text-amber-700',
  active: 'bg-green-50 text-green-700',
  paused: 'bg-orange-50 text-orange-700',
  completed: 'bg-blue-50 text-blue-700',
  inactive: 'bg-gray-100 text-gray-500',
}

type SortKey = 'number' | 'name' | 'email' | 'projects' | 'status'
type SortDir = 'asc' | 'desc'

function compare(a: string | number | null, b: string | number | null): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'de')
}

/** Dezentes "Kein Portal-Zugang"-Icon statt Text-Badge — vermeidet den Zeilenumbruch, der bei
 * langen Namen in der schmalen Tabellenspalte entstand, und wirkt insgesamt leichter/cleaner. */
function NoPortalIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 text-gray-300 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-label="Kein Portal-Zugang"
    >
      <title>Kein Portal-Zugang</title>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M5.64 5.64l12.72 12.72" />
    </svg>
  )
}

function SortIcon({ dir }: { dir: SortDir }) {
  return (
    <svg
      className={`w-3 h-3 transition-transform ${dir === 'desc' ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  )
}

function Th({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  dir: SortDir
  onSort: (key: SortKey) => void
}) {
  const isActive = activeKey === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-600 transition-colors"
      style={{ fontFamily: 'var(--font-dm-sans)' }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && <SortIcon dir={dir} />}
      </span>
    </th>
  )
}

export function ClientsTable({ rows }: { rows: ClientRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('number')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    const withKey = (row: ClientRow): string | number | null => {
      switch (sortKey) {
        case 'number':
          return row.number
        case 'name':
          return row.displayName
        case 'email':
          return row.email
        case 'projects':
          return row.projectCount
        case 'status':
          return CLIENT_STATUS_LABEL[row.status]
      }
    }
    const result = [...rows].sort((a, b) => compare(withKey(a), withKey(b)))
    return sortDir === 'asc' ? result : result.reverse()
  }, [rows, sortKey, sortDir])

  return (
    <>
      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-50">
        {sorted.map((client) => (
          <Link
            key={client.id}
            href={`/admin/clients/${client.id}`}
            className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-semibold shrink-0">
              {client.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {client.number && (
                  <span className="text-xs text-gray-400 font-mono shrink-0" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {client.number}
                  </span>
                )}
                <p className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {client.displayName}
                </p>
                {!client.hasPortalAccess && <NoPortalIcon />}
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {client.email ?? '—'} · {client.projectCount} {client.projectCount === 1 ? 'Projekt' : 'Projekte'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${CLIENT_STATUS_COLOR[client.status]}`} style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {CLIENT_STATUS_LABEL[client.status]}
              </span>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <table className="hidden md:table w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <Th label="Nr." sortKey="number" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <Th label="Kunde" sortKey="name" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <Th label="E-Mail" sortKey="email" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <Th label="Projekte" sortKey="projects" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <Th label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <th className="px-6 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((client) => (
            <tr key={client.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <span className="text-xs text-gray-400 font-mono" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {client.number ?? '—'}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-semibold shrink-0">
                    {client.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>{client.displayName}</p>
                      {!client.hasPortalAccess && <NoPortalIcon />}
                    </div>
                    {client.companyName && (
                      <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>{client.companyName}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>{client.email ?? '—'}</p>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {client.projectCount} {client.projectCount === 1 ? 'Projekt' : 'Projekte'}
                </span>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${CLIENT_STATUS_COLOR[client.status]}`}
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  {CLIENT_STATUS_LABEL[client.status]}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <Link href={`/admin/clients/${client.id}`} className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Details →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
