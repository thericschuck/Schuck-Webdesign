'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ProjectStatus } from '@/types/database'
import { ProjectsTable, type ProjectRow } from './ProjectsTable'

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

export function ProjectsBoard({ rows, initialStatus = null }: { rows: ProjectRow[]; initialStatus?: ProjectStatus | null }) {
  const [status, setStatus] = useState<ProjectStatus | null>(initialStatus)

  const filtered = useMemo(
    () => (status ? rows.filter((r) => r.status === status) : rows),
    [rows, status]
  )

  return (
    <div className="flex flex-col gap-6">
      <p className="text-gray-500 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        {filtered.length} Projekte{status ? ` (${STATUS_LABEL[status]})` : ''}
      </p>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatus(null)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            !status ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Alle
        </button>
        {(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              status === s ? 'bg-gray-900 text-white' : STATUS_COLOR[s] + ' hover:opacity-80'
            }`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* List / Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length > 0 ? (
          <ProjectsTable rows={filtered} />
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-gray-400 text-sm mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>Keine Projekte gefunden.</p>
            <Link href="/admin/projects/new" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:underline" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Erstes Projekt anlegen →
            </Link>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>Keine Projekte für diesen Filter gefunden.</p>
          </div>
        )}
      </div>
    </div>
  )
}
