'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ProjectStatus } from '@/types/database'

export interface ProjectRow {
  id: string
  number: string | null
  title: string
  status: ProjectStatus
  startDate: string | null
  launchDate: string | null
  clientId: string | null
  clientName: string | null
  unreadCount: number
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  briefing: 'Briefing',
  design: 'Design',
  development: 'Entwicklung',
  review: 'Review',
  live: 'Live',
}

const STATUS_COLOR: Record<ProjectStatus, string> = {
  briefing: 'bg-gray-100 text-gray-600',
  design: 'bg-blue-50 text-blue-700',
  development: 'bg-amber-50 text-amber-700',
  review: 'bg-purple-50 text-purple-700',
  live: 'bg-green-50 text-green-700',
}

function formatDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('de-DE') : '—'
}

type SortKey = 'number' | 'title' | 'client' | 'status' | 'launch'
type SortDir = 'asc' | 'desc'

function compare(a: string | number | null, b: string | number | null): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'de')
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
  activeKey: SortKey | null
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

export function ProjectsTable({ rows }: { rows: ProjectRow[] }) {
  // Kein aktiver Standard-Sort — die Reihenfolge kommt initial von der Server-Query
  // (neueste zuerst); erst ein Klick auf eine Spalte aktiviert eine explizite Sortierung.
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    const withKey = (row: ProjectRow): string | number | null => {
      switch (sortKey) {
        case 'number':
          return row.number
        case 'title':
          return row.title
        case 'client':
          return row.clientName
        case 'status':
          return STATUS_LABEL[row.status]
        case 'launch':
          return row.launchDate
      }
    }
    const result = [...rows].sort((a, b) => compare(withKey(a), withKey(b)))
    return sortDir === 'asc' ? result : result.reverse()
  }, [rows, sortKey, sortDir])

  return (
    <>
      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-50">
        {sorted.map((project) => (
          <Link
            key={project.id}
            href={`/admin/projects/${project.id}`}
            className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {project.number && (
                  <span className="text-xs text-gray-400 font-mono shrink-0" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {project.number}
                  </span>
                )}
                <p className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {project.title}
                </p>
                {project.unreadCount > 0 && (
                  <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none font-medium shrink-0">
                    {project.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {project.clientName ?? '—'}{project.launchDate ? ` · Launch: ${formatDate(project.launchDate)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[project.status]}`} style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {STATUS_LABEL[project.status]}
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
            <Th label="Projekt" sortKey="title" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <Th label="Kunde" sortKey="client" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <Th label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <Th label="Launch" sortKey="launch" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <th className="px-6 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((project) => (
            <tr key={project.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <span className="text-xs text-gray-400 font-mono" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {project.number ?? '—'}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>{project.title}</p>
                  {project.unreadCount > 0 && (
                    <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none font-medium">
                      {project.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {project.startDate ? `Start: ${formatDate(project.startDate)}` : 'Kein Startdatum'}
                </p>
              </td>
              <td className="px-6 py-4">
                {project.clientId ? (
                  <Link href={`/admin/clients/${project.clientId}`} className="text-sm text-gray-700 hover:text-gray-900 hover:underline" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {project.clientName}
                  </Link>
                ) : (
                  <span className="text-sm text-gray-400">—</span>
                )}
              </td>
              <td className="px-6 py-4">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[project.status]}`} style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {STATUS_LABEL[project.status]}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {formatDate(project.launchDate)}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <Link href={`/admin/projects/${project.id}`} className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors" style={{ fontFamily: 'var(--font-dm-sans)' }}>
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
