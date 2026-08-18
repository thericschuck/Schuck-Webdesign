'use client'

import { useMemo, useState } from 'react'
import { LeadCard } from './LeadCard'
import { LeadsTable } from './LeadsTable'
import { STAGE_LABEL, STAGE_ORDER } from './stage-constants'
import type { AkquiseErgebnis, LeadPrioritaet, LeadStage } from '@/types/database'

export interface AkquiseLeadRow {
  id: string
  lead_number: string
  firmenname: string
  zielgruppe: string | null
  stadt: string | null
  quelle: string | null
  prioritaet: LeadPrioritaet
  akquise_ergebnis: AkquiseErgebnis
  current_stage: LeadStage
  wiedervorlage: string | null
  sheet_lead_id: string | null
  last_synced_at: string | null
  created_at: string
}

const CSV_COLUMNS: { key: keyof AkquiseLeadRow; header: string }[] = [
  { key: 'lead_number', header: 'Lead-Nr.' },
  { key: 'firmenname', header: 'Firma' },
  { key: 'zielgruppe', header: 'Zielgruppe' },
  { key: 'stadt', header: 'Stadt' },
  { key: 'quelle', header: 'Quelle' },
  { key: 'prioritaet', header: 'Priorität' },
  { key: 'akquise_ergebnis', header: 'Ergebnis' },
  { key: 'current_stage', header: 'Stage' },
  { key: 'wiedervorlage', header: 'Wiedervorlage' },
  { key: 'sheet_lead_id', header: 'Sheet-ID' },
  { key: 'last_synced_at', header: 'Zuletzt synchronisiert' },
]

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadLeadsCsv(rows: AkquiseLeadRow[]) {
  const lines = [
    CSV_COLUMNS.map((c) => csvEscape(c.header)).join(';'),
    ...rows.map((row) => CSV_COLUMNS.map((c) => csvEscape(row[c.key])).join(';')),
  ]
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `akquise-leads-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const STAGE_COLOR: Record<LeadStage, string> = {
  erstkontakt: 'bg-gray-100 text-gray-600',
  quali_call: 'bg-blue-50 text-blue-700',
  closing_call: 'bg-amber-50 text-amber-700',
  gewonnen: 'bg-green-50 text-green-700',
  verloren: 'bg-red-50 text-red-700',
}

const STAGE_DOT: Record<LeadStage, string> = {
  erstkontakt: 'bg-gray-400',
  quali_call: 'bg-blue-500',
  closing_call: 'bg-amber-500',
  gewonnen: 'bg-green-500',
  verloren: 'bg-red-400',
}

const PRIORITAET_LABEL: Record<LeadPrioritaet, string> = { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' }

function isDue(wiedervorlage: string | null) {
  return !!wiedervorlage && new Date(wiedervorlage) <= new Date()
}

// Ein Lead gilt als "neu seit letztem Sync", wenn er beim jüngsten Sync-Lauf angelegt
// wurde: last_synced_at fällt auf den insgesamt letzten Lauf UND liegt sehr nah an
// created_at (< 60s) — bei einem Update wächst dieser Abstand mit jedem weiteren Lauf.
const SAME_RUN_TOLERANCE_MS = 5 * 60 * 1000
const INSERT_VS_SYNCED_TOLERANCE_MS = 60 * 1000

function findLatestSyncAt(leads: AkquiseLeadRow[]): number | null {
  let latest: number | null = null
  for (const lead of leads) {
    if (!lead.last_synced_at) continue
    const t = new Date(lead.last_synced_at).getTime()
    if (latest === null || t > latest) latest = t
  }
  return latest
}

function isNewSinceLastSync(lead: AkquiseLeadRow, latestSyncAt: number | null): boolean {
  if (!lead.last_synced_at || latestSyncAt === null) return false
  const syncedAt = new Date(lead.last_synced_at).getTime()
  if (Math.abs(syncedAt - latestSyncAt) > SAME_RUN_TOLERANCE_MS) return false
  const createdAt = new Date(lead.created_at).getTime()
  return Math.abs(syncedAt - createdAt) < INSERT_VS_SYNCED_TOLERANCE_MS
}

export function AkquiseBoard({ leads }: { leads: AkquiseLeadRow[] }) {
  const [view, setView] = useState<'kanban' | 'tabelle'>('kanban')
  const [search, setSearch] = useState('')
  const [prioritaet, setPrioritaet] = useState<LeadPrioritaet | null>(null)
  const [quelle, setQuelle] = useState<string | null>(null)
  const [onlyDue, setOnlyDue] = useState(false)
  const [onlyNew, setOnlyNew] = useState(false)

  const newLeadIds = useMemo(() => {
    const latestSyncAt = findLatestSyncAt(leads)
    return new Set(leads.filter((l) => isNewSinceLastSync(l, latestSyncAt)).map((l) => l.id))
  }, [leads])

  const quelleOptions = useMemo(
    () => Array.from(new Set(leads.map((l) => l.quelle).filter((q): q is string => !!q))).sort(),
    [leads]
  )

  const stageCounts = useMemo(() => {
    const counts = new Map<LeadStage, number>()
    for (const stage of STAGE_ORDER) counts.set(stage, 0)
    for (const lead of leads) counts.set(lead.current_stage, (counts.get(lead.current_stage) ?? 0) + 1)
    return counts
  }, [leads])

  const dueCount = useMemo(() => leads.filter((l) => isDue(l.wiedervorlage)).length, [leads])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads.filter((lead) => {
      if (prioritaet && lead.prioritaet !== prioritaet) return false
      if (quelle && lead.quelle !== quelle) return false
      if (onlyDue && !isDue(lead.wiedervorlage)) return false
      if (onlyNew && !newLeadIds.has(lead.id)) return false
      if (q) {
        const haystack = `${lead.firmenname} ${lead.zielgruppe ?? ''} ${lead.stadt ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [leads, search, prioritaet, quelle, onlyDue, onlyNew, newLeadIds])

  const byStage = useMemo(() => {
    const map = new Map<LeadStage, AkquiseLeadRow[]>()
    for (const stage of STAGE_ORDER) map.set(stage, [])
    for (const lead of filtered) map.get(lead.current_stage)?.push(lead)
    return map
  }, [filtered])

  const hasFilters = !!(search || prioritaet || quelle || onlyDue || onlyNew)

  return (
    <div className="flex flex-col gap-6">
      {/* Stat-Übersicht */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Gesamt
          </p>
          <p className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            {leads.length}
          </p>
        </div>
        {STAGE_ORDER.map((stage) => (
          <div key={stage} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-xs text-gray-400 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              <span className={`w-1.5 h-1.5 rounded-full ${STAGE_DOT[stage]}`} />
              {STAGE_LABEL[stage]}
            </p>
            <p className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
              {stageCounts.get(stage) ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {dueCount > 0 && (
          <button
            onClick={() => setOnlyDue((v) => !v)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors ${
              onlyDue ? 'bg-red-600 border-red-600 text-white' : 'bg-red-50 border-red-100 text-red-700 hover:bg-red-100'
            }`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${onlyDue ? 'bg-white' : 'bg-red-500'}`} />
            {dueCount} {dueCount === 1 ? 'Wiedervorlage' : 'Wiedervorlagen'} fällig
          </button>
        )}
        {newLeadIds.size > 0 && (
          <button
            onClick={() => setOnlyNew((v) => !v)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors ${
              onlyNew ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
            }`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${onlyNew ? 'bg-white' : 'bg-emerald-500'}`} />
            {newLeadIds.size} {newLeadIds.size === 1 ? 'neuer Lead' : 'neue Leads'} seit letztem Sync
          </button>
        )}
      </div>

      {/* Filterleiste + Ansicht-Umschalter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
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
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Firma, Zielgruppe oder Stadt suchen…"
              className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            />
          </div>
          <select
            value={prioritaet ?? ''}
            onChange={(e) => setPrioritaet((e.target.value as LeadPrioritaet) || null)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            <option value="">Alle Prioritäten</option>
            {(Object.keys(PRIORITAET_LABEL) as LeadPrioritaet[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITAET_LABEL[p]}
              </option>
            ))}
          </select>
          {quelleOptions.length > 0 && (
            <select
              value={quelle ?? ''}
              onChange={(e) => setQuelle(e.target.value || null)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              <option value="">Alle Quellen</option>
              {quelleOptions.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          )}
          {hasFilters && (
            <button
              onClick={() => {
                setSearch('')
                setPrioritaet(null)
                setQuelle(null)
                setOnlyDue(false)
                setOnlyNew(false)
              }}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Zurücksetzen
            </button>
          )}

          <button
            onClick={() => downloadLeadsCsv(filtered)}
            title="CSV der aktuell gefilterten Leads herunterladen"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
            CSV
          </button>

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 ml-auto">
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Kanban
            </button>
            <button
              onClick={() => setView('tabelle')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'tabelle' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Tabelle
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {filtered.length} von {leads.length} Leads{hasFilters ? ' (gefiltert)' : ''}
        </p>
      </div>

      {/* Kanban */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {STAGE_ORDER.map((stage) => {
            const stageLeads = byStage.get(stage) ?? []
            return (
              <div key={stage} className="flex flex-col gap-3 bg-gray-50 rounded-2xl p-3 min-h-[220px]">
                <div className="flex items-center justify-between px-1">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${STAGE_COLOR[stage]}`}
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    {STAGE_LABEL[stage]}
                  </span>
                  <span className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {stageLeads.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {stageLeads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} isNew={newLeadIds.has(lead.id)} />
                  ))}
                  {stageLeads.length === 0 && (
                    <p className="text-xs text-gray-300 text-center py-6" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      Keine Leads
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabelle — besser geeignet, um viele Leads auszuwerten */}
      {view === 'tabelle' && <LeadsTable leads={filtered} newLeadIds={newLeadIds} />}
    </div>
  )
}
