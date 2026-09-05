'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ClientStatus } from '@/types/database'
import { STATUS_DOT, STATUS_LABEL as PROJECT_STATUS_LABEL } from '../projects/status-constants'
import type { ClientRow } from './types'

const ALL_KEY = '__all__'

const FONT = { fontFamily: 'var(--font-dm-sans)' } as const

/** Reihenfolge der Kunden-Leiste — vom Lead bis zum inaktiven Kunden. */
const STATUS_ORDER: ClientStatus[] = ['lead', 'pending', 'active', 'paused', 'completed', 'inactive']

const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  lead: 'Lead',
  pending: 'Ausstehend',
  active: 'Aktiv',
  paused: 'Pausiert',
  completed: 'Abgeschlossen',
  inactive: 'Inaktiv',
}

const CLIENT_STATUS_PILL: Record<ClientStatus, string> = {
  lead: 'bg-purple-50 text-purple-700',
  pending: 'bg-amber-50 text-amber-700',
  active: 'bg-green-50 text-green-700',
  paused: 'bg-orange-50 text-orange-700',
  completed: 'bg-blue-50 text-blue-700',
  inactive: 'bg-gray-100 text-gray-500',
}

/** Avatar-Tönung deterministisch aus dem Namen — Kunden werden dadurch im Raster
 * wiedererkennbar, ohne dass irgendwo eine Farbe gepflegt werden muss. */
const AVATAR_TINTS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

function avatarTint(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % AVATAR_TINTS.length
  return AVATAR_TINTS[hash]
}

type SortKey = 'number' | 'name' | 'projects' | 'status'

const SORT_LABEL: Record<SortKey, string> = {
  number: 'Neueste zuerst',
  name: 'Name A–Z',
  projects: 'Meiste Projekte',
  status: 'Status',
}

function matchesQuery(client: ClientRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const fields = [client.displayName, client.companyName, client.email, client.number, client.city, client.phone]
  return fields.some((v) => v?.toLowerCase().includes(q)) || client.projects.some((p) => p.title.toLowerCase().includes(q))
}

/** Kartenklick navigiert zur Detailseite, außer der Nutzer wollte Text markieren
 * (z.B. E-Mail kopieren) oder hat direkt einen Link/Button getroffen. */
function handleCardClick(router: ReturnType<typeof useRouter>, href: string) {
  return (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.getSelection()?.toString()) return
    if ((e.target as HTMLElement).closest('a, button')) return
    router.push(href)
  }
}

function hostname(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function href(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`
}

// ── Bausteine ────────────────────────────────────────────────────────────────

function StatTile({ label, value, dotColor }: { label: string; value: number; dotColor: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-2.5">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <span className="text-sm font-medium text-gray-700" style={FONT}>
        {value} {label}
      </span>
    </div>
  )
}

/** Dezentes "Kein Portal-Zugang"-Icon statt Text-Badge — hält die Namenszeile ruhig. */
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

function ContactLink({ href: to, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={to}
      target={to.startsWith('http') ? '_blank' : undefined}
      rel={to.startsWith('http') ? 'noreferrer noopener' : undefined}
      // max-w-full ist der eigentliche Fix: in einer flex-wrap-Zeile schrumpft
      // ein einzelnes Item nicht automatisch mit — eine sehr lange E-Mail ohne
      // Umbruchpunkt lief bislang trotz `truncate` auf der Innenspan über den
      // Kartenrand hinaus, weil dem <a> selbst keine Breitenobergrenze gesetzt
      // war (truncate braucht eine tatsächliche Breite, um kürzen zu können).
      className="inline-flex items-center gap-1.5 max-w-full text-xs text-gray-400 hover:text-gray-900 transition-colors min-w-0"
      style={FONT}
      title={label}
    >
      <span className="shrink-0">{icon}</span>
      {/* min-w-0 hier zusätzlich zum max-w-full oben am <a>: als Flex-Kind von
          <a> hätte dieser Span sonst "min-width: auto" und würde sich auf
          seine Textbreite bestehen, statt für die Ellipse zu schrumpfen. */}
      <span className="truncate min-w-0">{label}</span>
    </a>
  )
}

const ICON_CLASS = 'w-3.5 h-3.5'

// ── Kundenkarte ──────────────────────────────────────────────────────────────

function ClientCard({ client }: { client: ClientRow }) {
  const router = useRouter()

  return (
    <div
      onClick={handleCardClick(router, `/admin/clients/${client.id}`)}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3.5 cursor-pointer transition-colors hover:border-gray-300"
    >
      {/* Kopf: Avatar, Name, Firma, Nr./Ort + Status */}
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold shrink-0 ${avatarTint(client.displayName)}`}
          style={FONT}
        >
          {client.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/admin/clients/${client.id}`}
              className="text-base font-semibold text-gray-900 truncate group-hover:text-gray-500 transition-colors"
              style={FONT}
            >
              {client.displayName}
            </Link>
            {!client.hasPortalAccess && <NoPortalIcon />}
          </div>
          {client.companyName && (
            <p className="text-xs text-gray-500 truncate" style={FONT}>
              {client.companyName}
            </p>
          )}
          <p className="text-xs text-gray-400 truncate mt-0.5" style={FONT}>
            <span className="font-mono">{client.number ?? '—'}</span>
            {client.city ? ` · ${client.city}` : ''}
          </p>
        </div>
        <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${CLIENT_STATUS_PILL[client.status]}`} style={FONT}>
          {CLIENT_STATUS_LABEL[client.status]}
        </span>
      </div>

      {/* Kontaktwege — direkt anklickbar, ohne Umweg über die Detailseite */}
      {(client.email || client.phone || client.website) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-gray-100 pt-3">
          {client.email && (
            <ContactLink
              href={`mailto:${client.email}`}
              label={client.email}
              icon={
                <svg className={ICON_CLASS} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />
          )}
          {client.phone && (
            <ContactLink
              href={`tel:${client.phone.replace(/\s/g, '')}`}
              label={client.phone}
              icon={
                <svg className={ICON_CLASS} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.2 3.6a1 1 0 01-.5 1.2L7.5 9.5a11 11 0 007 7l1.02-1.43a1 1 0 011.2-.5l3.6 1.2a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C10.6 21 3 13.4 3 6V5z" />
                </svg>
              }
            />
          )}
          {client.website && (
            <ContactLink
              href={href(client.website)}
              label={hostname(client.website)}
              icon={
                <svg className={ICON_CLASS} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18 15 15 0 010-18z" />
                </svg>
              }
            />
          )}
        </div>
      )}

      {/* Projekte als Chips — zeigt sofort, was für diesen Kunden läuft */}
      <div className="border-t border-gray-100 pt-3">
        {client.projects.length === 0 ? (
          <p className="text-xs text-gray-300" style={FONT}>
            Noch keine Projekte
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {client.projects.map((project) => (
              <Link
                key={project.id}
                href={`/admin/projects/${project.id}`}
                title={`${project.title} · ${PROJECT_STATUS_LABEL[project.status]}`}
                className="inline-flex items-center gap-1.5 max-w-44 text-xs px-2 py-1 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                style={FONT}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[project.status]}`} />
                <span className="truncate">{project.title}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Status-Leiste ────────────────────────────────────────────────────────────

function RailItem({
  active,
  onClick,
  title,
  dotColor,
  count,
}: {
  active: boolean
  onClick: () => void
  title: string
  dotColor?: string
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 rounded-xl border transition-colors flex items-center gap-2.5 ${
        active ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-100 text-gray-700 hover:border-gray-300'
      }`}
    >
      {dotColor && <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />}
      <span className={`text-sm font-medium truncate flex-1 ${active ? 'text-white' : 'text-gray-800'}`} style={FONT}>
        {title}
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

const RAIL_DOT: Record<ClientStatus, string> = {
  lead: 'bg-purple-500',
  pending: 'bg-amber-500',
  active: 'bg-green-500',
  paused: 'bg-orange-500',
  completed: 'bg-blue-500',
  inactive: 'bg-gray-300',
}

// ── Board ────────────────────────────────────────────────────────────────────

export function ClientsBoard({ rows }: { rows: ClientRow[] }) {
  const [activeKey, setActiveKey] = useState<ClientStatus | typeof ALL_KEY>(ALL_KEY)
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('number')

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => r.status === 'active').length,
      leads: rows.filter((r) => r.status === 'lead').length,
      noPortal: rows.filter((r) => !r.hasPortalAccess).length,
    }),
    [rows]
  )

  const visible = useMemo(() => rows.filter((r) => matchesQuery(r, query)), [rows, query])

  const byStatus = useMemo(() => {
    const map = new Map<ClientStatus, ClientRow[]>()
    for (const status of STATUS_ORDER) map.set(status, [])
    for (const client of visible) map.get(client.status)?.push(client)
    return map
  }, [visible])

  // Nur Status anzeigen, unter denen im Gesamtbestand überhaupt Kunden liegen —
  // die Leiste bleibt dadurch kurz, springt aber beim Suchen nicht.
  const railStatuses = useMemo(() => STATUS_ORDER.filter((s) => rows.some((r) => r.status === s)), [rows])

  const current = useMemo(() => {
    const list = activeKey === ALL_KEY ? visible : byStatus.get(activeKey) ?? []
    const sorted = [...list]
    if (sortKey === 'number') sorted.sort((a, b) => (b.number ?? '').localeCompare(a.number ?? '', 'de'))
    if (sortKey === 'name') sorted.sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'))
    if (sortKey === 'projects') sorted.sort((a, b) => b.projects.length - a.projects.length)
    if (sortKey === 'status') {
      sorted.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.displayName.localeCompare(b.displayName, 'de'))
    }
    return sorted
  }, [activeKey, visible, byStatus, sortKey])

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-16 text-center">
        <p className="text-gray-400 text-sm mb-3" style={FONT}>
          Noch keine Kunden angelegt.
        </p>
        <Link href="/admin/clients/new" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:underline" style={FONT}>
          Ersten Kunden anlegen →
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <StatTile label="Kunden" value={stats.total} dotColor="bg-gray-900" />
        <StatTile label="aktiv" value={stats.active} dotColor="bg-green-500" />
        {stats.leads > 0 && <StatTile label="Leads" value={stats.leads} dotColor="bg-purple-500" />}
        {stats.noPortal > 0 && <StatTile label="ohne Portal-Zugang" value={stats.noPortal} dotColor="bg-gray-300" />}
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
            placeholder="Kunde, Firma, E-Mail oder Projekt suchen…"
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
        {/* Status-Leiste — ein Klick auf "Lead" oder "Aktiv" statt Sortieren und Scrollen */}
        <nav
          className="flex w-full lg:w-56 lg:flex-col gap-2 overflow-x-auto lg:overflow-visible custom-scrollbar pb-1 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0 lg:shrink-0 lg:sticky lg:top-8"
          aria-label="Kundenstatus"
        >
          <RailItem active={activeKey === ALL_KEY} onClick={() => setActiveKey(ALL_KEY)} title="Alle Kunden" count={visible.length} />
          {railStatuses.map((status) => (
            <RailItem
              key={status}
              active={activeKey === status}
              onClick={() => setActiveKey(status)}
              title={CLIENT_STATUS_LABEL[status]}
              dotColor={RAIL_DOT[status]}
              count={byStatus.get(status)?.length ?? 0}
            />
          ))}
        </nav>

        {/* Kartenraster
            w-full zusätzlich zu min-w-0: der Elternflex steht mobil auf
            flex-col mit items-start statt align-items:stretch — ohne w-full
            richtet sich dieses Kind an seinem Karteninhalt aus statt auf
            Containerbreite gestreckt zu werden (gleiches Muster wie
            ProductsBoard.tsx/ProjectsBoard.tsx). */}
        <div className="flex-1 min-w-0 w-full">
          {current.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
              <p className="text-gray-400 text-sm" style={FONT}>
                {query.trim() ? `Kein Kunde gefunden für „${query}“.` : 'Keine Kunden mit diesem Status.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {current.map((client) => (
                <ClientCard key={client.id} client={client} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
