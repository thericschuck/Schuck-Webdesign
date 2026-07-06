import Link from 'next/link'
import * as akquiseDomain from '@/lib/domain/akquise'
import { LeadCard } from './LeadCard'
import { NewLeadPanel } from './NewLeadPanel'
import { STAGE_LABEL, STAGE_ORDER } from './stage-constants'
import type { LeadPrioritaet, LeadStage } from '@/types/database'

const QUELLE_OPTIONS = [
  'KI',
  'Google',
  'LinkedIn',
  'Empfehlung',
  'Kaltakquise',
  'Messe',
  'DATEV',
  'Anwaltskammer',
  'Website',
  'Netzwerk',
]

const STAGE_COLOR: Record<LeadStage, string> = {
  erstkontakt: 'bg-gray-100 text-gray-600',
  quali_call: 'bg-blue-50 text-blue-700',
  closing_call: 'bg-amber-50 text-amber-700',
  gewonnen: 'bg-green-50 text-green-700',
  verloren: 'bg-red-50 text-red-700',
}

interface SearchParams {
  q?: string
  prioritaet?: string
  quelle?: string
  wiedervorlage?: string
}

export default async function AkquisePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams

  const leads = await akquiseDomain.listLeads({
    search: sp.q || undefined,
    prioritaet: (sp.prioritaet as LeadPrioritaet) || undefined,
    quelle: sp.quelle || undefined,
    wiedervorlageDue: sp.wiedervorlage === '1',
  })

  const byStage = new Map<LeadStage, typeof leads>()
  for (const stage of STAGE_ORDER) byStage.set(stage, [])
  for (const lead of leads) {
    byStage.get(lead.current_stage)?.push(lead)
  }

  const hasFilters = !!(sp.q || sp.prioritaet || sp.quelle || sp.wiedervorlage)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Akquise
          </h1>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {leads.length} {leads.length === 1 ? 'Lead' : 'Leads'}
            {hasFilters ? ' (gefiltert)' : ' insgesamt'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/akquise/tracking"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Tracking
          </Link>
          <Link
            href="/admin/akquise/stats"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Statistik
          </Link>
          <NewLeadPanel />
        </div>
      </div>

      {/* Filterleiste */}
      <form
        method="GET"
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3"
      >
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Firmenname suchen…"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white flex-1 min-w-[180px]"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        />
        <select
          name="prioritaet"
          defaultValue={sp.prioritaet ?? ''}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          <option value="">Alle Prioritäten</option>
          <option value="high">Hoch</option>
          <option value="medium">Mittel</option>
          <option value="low">Niedrig</option>
        </select>
        <select
          name="quelle"
          defaultValue={sp.quelle ?? ''}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          <option value="">Alle Quellen</option>
          {QUELLE_OPTIONS.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          <input type="checkbox" name="wiedervorlage" value="1" defaultChecked={sp.wiedervorlage === '1'} />
          Wiedervorlage fällig
        </label>
        <button
          type="submit"
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Filtern
        </button>
        {hasFilters && (
          <Link
            href="/admin/akquise"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Zurücksetzen
          </Link>
        )}
      </form>

      {/* Kanban-Board */}
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
                  <LeadCard key={lead.id} lead={lead} />
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
    </div>
  )
}
