'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ProjectStatus } from '@/types/database'
import { STATUS_DOT, STATUS_LABEL, STATUS_ORDER, STATUS_PILL, stageIndex } from './status-constants'
import type { ProjectRow } from './types'

const ALL_KEY = '__all__'

type SortKey = 'recent' | 'title' | 'client' | 'launch'

const SORT_LABEL: Record<SortKey, string> = {
  recent: 'Neueste zuerst',
  title: 'Titel A–Z',
  client: 'Kunde A–Z',
  launch: 'Launch zuerst',
}

const FONT = { fontFamily: 'var(--font-dm-sans)' } as const

function formatDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

function matchesQuery(project: ProjectRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [project.title, project.number, project.clientName, project.clientCompany].some((v) => v?.toLowerCase().includes(q))
}

function isLaunchOverdue(project: ProjectRow, today: Date): boolean {
  return project.launchDate != null && project.status !== 'live' && new Date(project.launchDate) < today
}

/** Kartenklick navigiert zur Detailseite, außer der Nutzer wollte Text markieren
 * (z.B. Projektnummer kopieren) oder hat direkt einen Link/Button getroffen. */
function handleCardClick(router: ReturnType<typeof useRouter>, href: string) {
  return (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.getSelection()?.toString()) return
    if ((e.target as HTMLElement).closest('a, button')) return
    router.push(href)
  }
}

// ── Bausteine ────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  dotColor,
  tone = 'default',
}: {
  label: string
  value: number
  dotColor: string
  tone?: 'default' | 'alert'
}) {
  return (
    <div
      className={`bg-white rounded-xl border shadow-sm px-4 py-3 flex items-center gap-2.5 ${
        tone === 'alert' ? 'border-red-100' : 'border-gray-100'
      }`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <span className={`text-sm font-medium ${tone === 'alert' ? 'text-red-600' : 'text-gray-700'}`} style={FONT}>
        {value} {label}
      </span>
    </div>
  )
}

/** Fortschritt durch die fünf Projektphasen — sichtbar, ohne die Detailseite zu öffnen. */
function PipelineBar({ status }: { status: ProjectStatus }) {
  const current = stageIndex(status)
  return (
    <div className="flex items-center gap-1" title={`Phase ${current + 1} von ${STATUS_ORDER.length}: ${STATUS_LABEL[status]}`}>
      {STATUS_ORDER.map((stage, i) => (
        <span
          key={stage}
          className={`h-1.5 flex-1 rounded-full ${i < current ? 'bg-gray-900' : i === current ? STATUS_DOT[status] : 'bg-gray-100'}`}
        />
      ))}
    </div>
  )
}

function MetaItem({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'alert' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${tone === 'alert' ? 'text-red-500 font-medium' : 'text-gray-400'}`} style={FONT}>
      {children}
    </span>
  )
}

// ── Projektkarte ─────────────────────────────────────────────────────────────

function ProjectCard({ project, today }: { project: ProjectRow; today: Date }) {
  const router = useRouter()
  const overdue = isLaunchOverdue(project, today)

  return (
    <div
      onClick={handleCardClick(router, `/admin/projects/${project.id}`)}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3.5 cursor-pointer transition-colors hover:border-gray-300"
    >
      {/* Kopf: Nummer, Titel, Kunde + Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono" style={FONT}>
              {project.number ?? '—'}
            </span>
            {project.unreadCount > 0 && (
              <span
                className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none font-medium"
                style={FONT}
                title={`${project.unreadCount} ungelesene Nachricht${project.unreadCount === 1 ? '' : 'en'}`}
              >
                {project.unreadCount}
              </span>
            )}
          </div>
          <Link
            href={`/admin/projects/${project.id}`}
            className="block text-base font-semibold text-gray-900 truncate mt-0.5 group-hover:text-gray-500 transition-colors"
            style={FONT}
          >
            {project.title}
          </Link>
          {project.clientId ? (
            <p className="text-xs text-gray-400 truncate mt-0.5" style={FONT}>
              <Link href={`/admin/clients/${project.clientId}`} className="hover:text-gray-700 hover:underline">
                {project.clientName}
              </Link>
              {project.clientCompany ? ` · ${project.clientCompany}` : ''}
            </p>
          ) : (
            <p className="text-xs text-gray-300 mt-0.5" style={FONT}>
              Kein Kunde verknüpft
            </p>
          )}
        </div>
        <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_PILL[project.status]}`} style={FONT}>
          {STATUS_LABEL[project.status]}
        </span>
      </div>

      <PipelineBar status={project.status} />

      {/* Fuß: Termine, offene Aufgaben, Live-Link */}
      <div className="border-t border-gray-100 pt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {project.startDate && <MetaItem>Start {formatDate(project.startDate)}</MetaItem>}
        {project.launchDate && (
          <MetaItem tone={overdue ? 'alert' : 'default'}>
            {overdue ? '⚠ ' : ''}Launch {formatDate(project.launchDate)}
          </MetaItem>
        )}
        {project.openTodos > 0 && (
          <MetaItem tone={project.overdueTodos > 0 ? 'alert' : 'default'}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${project.overdueTodos > 0 ? 'bg-red-500' : 'bg-gray-300'}`} />
            {project.openTodos} offen
          </MetaItem>
        )}
        {project.liveUrl && (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900 transition-colors ml-auto"
            style={FONT}
          >
            Website
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5v5m0-5L10 14M9 5H6a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-3" />
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}

// ── Phasen-Leiste ────────────────────────────────────────────────────────────

function RailItem({
  active,
  onClick,
  title,
  step,
  count,
  alert,
}: {
  active: boolean
  onClick: () => void
  title: string
  step?: number
  count: number
  alert?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 rounded-xl border transition-colors flex items-center gap-2.5 ${
        active ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-100 text-gray-700 hover:border-gray-300'
      }`}
    >
      {step != null && (
        <span
          className={`shrink-0 w-5 h-5 rounded-md text-[10px] font-semibold flex items-center justify-center ${
            active ? 'bg-white/15 text-white/80' : 'bg-gray-50 text-gray-400'
          }`}
          style={FONT}
        >
          {step}
        </span>
      )}
      <span className="min-w-0 flex-1 flex items-center gap-1.5">
        {alert && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-red-300' : 'bg-red-500'}`} />}
        <span className={`text-sm font-medium truncate ${active ? 'text-white' : 'text-gray-800'}`} style={FONT}>
          {title}
        </span>
      </span>
      <span
        className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full ${active ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-600'}`}
        style={FONT}
      >
        {count}
      </span>
    </button>
  )
}

// ── Board ────────────────────────────────────────────────────────────────────

export function ProjectsBoard({ rows, initialStatus = null }: { rows: ProjectRow[]; initialStatus?: ProjectStatus | null }) {
  const [activeKey, setActiveKey] = useState<ProjectStatus | typeof ALL_KEY>(initialStatus ?? ALL_KEY)
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('recent')

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const stats = useMemo(
    () => ({
      total: rows.length,
      live: rows.filter((r) => r.status === 'live').length,
      inProgress: rows.filter((r) => r.status !== 'live').length,
      unread: rows.reduce((sum, r) => sum + r.unreadCount, 0),
      overdue: rows.filter((r) => isLaunchOverdue(r, today)).length,
    }),
    [rows, today]
  )

  const visible = useMemo(() => rows.filter((r) => matchesQuery(r, query)), [rows, query])

  const byStatus = useMemo(() => {
    const map = new Map<ProjectStatus, ProjectRow[]>()
    for (const status of STATUS_ORDER) map.set(status, [])
    for (const project of visible) map.get(project.status)?.push(project)
    return map
  }, [visible])

  // `rows` kommt serverseitig schon neueste-zuerst — 'recent' lässt diese Reihenfolge unangetastet.
  const current = useMemo(() => {
    const list = activeKey === ALL_KEY ? visible : byStatus.get(activeKey) ?? []
    if (sortKey === 'recent') return list
    const sorted = [...list]
    if (sortKey === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title, 'de'))
    if (sortKey === 'client') sorted.sort((a, b) => (a.clientName ?? 'zzz').localeCompare(b.clientName ?? 'zzz', 'de'))
    if (sortKey === 'launch') {
      sorted.sort((a, b) => {
        if (!a.launchDate && !b.launchDate) return 0
        if (!a.launchDate) return 1
        if (!b.launchDate) return -1
        return a.launchDate.localeCompare(b.launchDate)
      })
    }
    return sorted
  }, [activeKey, visible, byStatus, sortKey])

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-16 text-center">
        <p className="text-gray-400 text-sm mb-3" style={FONT}>
          Noch keine Projekte angelegt.
        </p>
        <Link href="/admin/projects/new" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:underline" style={FONT}>
          Erstes Projekt anlegen →
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <StatTile label="Projekte" value={stats.total} dotColor="bg-gray-900" />
        <StatTile label="in Arbeit" value={stats.inProgress} dotColor="bg-amber-500" />
        <StatTile label="live" value={stats.live} dotColor="bg-green-500" />
        {stats.unread > 0 && <StatTile label="ungelesen" value={stats.unread} dotColor="bg-red-500" tone="alert" />}
        {stats.overdue > 0 && <StatTile label="Launch überfällig" value={stats.overdue} dotColor="bg-red-500" tone="alert" />}
      </div>

      {/* Suche + Sortierung */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="w-4 h-4 text-gray-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Projekt, Nummer oder Kunde suchen…"
            className="w-full rounded-xl border border-gray-100 bg-white shadow-sm pl-10 pr-4 py-2.5 text-sm outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100"
            style={FONT}
          />
        </div>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          aria-label="Sortierung"
          className="rounded-xl border border-gray-100 bg-white shadow-sm px-3 py-2.5 text-sm text-gray-600 outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100"
          style={FONT}
        >
          {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABEL[key]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Phasen-Leiste in Pipeline-Reihenfolge — jede Phase ist einen Klick entfernt */}
        <nav
          className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible custom-scrollbar pb-1 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0 lg:w-56 lg:shrink-0 lg:sticky lg:top-8"
          aria-label="Projektphasen"
        >
          <RailItem
            active={activeKey === ALL_KEY}
            onClick={() => setActiveKey(ALL_KEY)}
            title="Alle Projekte"
            count={visible.length}
            alert={visible.some((r) => isLaunchOverdue(r, today))}
          />
          {STATUS_ORDER.map((status, i) => (
            <RailItem
              key={status}
              active={activeKey === status}
              onClick={() => setActiveKey(status)}
              title={STATUS_LABEL[status]}
              step={i + 1}
              count={byStatus.get(status)?.length ?? 0}
              alert={(byStatus.get(status) ?? []).some((r) => isLaunchOverdue(r, today))}
            />
          ))}
        </nav>

        {/* Kartenraster */}
        <div className="flex-1 min-w-0">
          {current.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
              <p className="text-gray-400 text-sm" style={FONT}>
                {query.trim() ? `Kein Projekt gefunden für „${query}“.` : 'Keine Projekte in dieser Phase.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {current.map((project) => (
                <ProjectCard key={project.id} project={project} today={today} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
