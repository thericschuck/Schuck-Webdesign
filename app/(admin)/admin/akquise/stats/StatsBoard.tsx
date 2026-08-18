'use client'

import { useMemo, useState } from 'react'
import { STAGE_LABEL } from '../stage-constants'
import type { LeadStage } from '@/types/database'
import type { ZielgruppenStatsRow } from '@/lib/domain/akquise'

const STAGE_COLOR: Record<LeadStage, string> = {
  erstkontakt: 'bg-gray-400',
  quali_call: 'bg-blue-500',
  closing_call: 'bg-amber-500',
  gewonnen: 'bg-green-500',
  verloren: 'bg-red-400',
}

const STAGE_BADGE: Record<LeadStage, string> = {
  erstkontakt: 'bg-gray-100 text-gray-600',
  quali_call: 'bg-blue-50 text-blue-700',
  closing_call: 'bg-amber-50 text-amber-700',
  gewonnen: 'bg-green-50 text-green-700',
  verloren: 'bg-red-50 text-red-700',
}

export interface FunnelStats {
  total_leads: number
  by_stage: Record<string, number>
  reached_quali_call: number
  reached_closing_call: number
  gewonnen: number
  conversion_rates_percent: {
    erstkontakt_zu_quali_call: number | null
    quali_call_zu_closing_call: number | null
    closing_call_zu_gewonnen: number | null
    gesamt_erstkontakt_zu_gewonnen: number | null
  }
}

function fmtPct(value: number | null) {
  return value == null ? '—' : `${value}%`
}

type ZielgruppenSort = 'total' | 'conversion'

export function StatsBoard({ stats, zielgruppen }: { stats: FunnelStats; zielgruppen: ZielgruppenStatsRow[] }) {
  const [sort, setSort] = useState<ZielgruppenSort>('total')

  const funnelSteps = [
    { label: 'Erstkontakt (alle Leads)', value: stats.total_leads, max: stats.total_leads },
    { label: 'Quali-Call erreicht', value: stats.reached_quali_call, max: stats.total_leads },
    { label: 'Closing-Call erreicht', value: stats.reached_closing_call, max: stats.total_leads },
    { label: 'Gewonnen', value: stats.gewonnen, max: stats.total_leads },
  ]

  const sortedZielgruppen = useMemo(() => {
    return [...zielgruppen].sort((a, b) =>
      sort === 'total' ? b.total - a.total : (b.conversionPercent ?? -1) - (a.conversionPercent ?? -1)
    )
  }, [zielgruppen, sort])

  return (
    <div className="flex flex-col gap-6">
      {/* Funnel-Balken */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Funnel
        </h2>
        <div className="flex flex-col gap-4">
          {funnelSteps.map((step, i) => {
            const widthPct = step.max > 0 ? Math.max((step.value / step.max) * 100, step.value > 0 ? 4 : 0) : 0
            return (
              <div key={step.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {step.label}
                  </span>
                  <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {step.value}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${['bg-gray-400', 'bg-blue-500', 'bg-amber-500', 'bg-green-500'][i]}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Konversionsraten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Erstkontakt → Quali-Call', value: stats.conversion_rates_percent.erstkontakt_zu_quali_call },
          { label: 'Quali-Call → Closing-Call', value: stats.conversion_rates_percent.quali_call_zu_closing_call },
          { label: 'Closing-Call → Gewonnen', value: stats.conversion_rates_percent.closing_call_zu_gewonnen },
          { label: 'Gesamt: Erstkontakt → Gewonnen', value: stats.conversion_rates_percent.gesamt_erstkontakt_zu_gewonnen },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-gray-500 text-xs mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {c.label}
            </p>
            <p className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
              {fmtPct(c.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Verteilung nach Stage */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Verteilung nach Stage
        </h2>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(STAGE_LABEL) as LeadStage[]).map((stage) => {
            const count = stats.by_stage[stage] ?? 0
            return (
              <span
                key={stage}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${STAGE_BADGE[stage]}`}
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                <span className={`w-2 h-2 rounded-full ${STAGE_COLOR[stage]}`} />
                {STAGE_LABEL[stage]} <span className="opacity-60">({count})</span>
              </span>
            )
          })}
        </div>
      </div>

      {/* Nach Zielgruppe */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Nach Zielgruppe
          </h2>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSort('total')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                sort === 'total' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Nach Anzahl
            </button>
            <button
              onClick={() => setSort('conversion')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                sort === 'conversion' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Nach Conversion
            </button>
          </div>
        </div>
        {sortedZielgruppen.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Noch keine Leads vorhanden.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedZielgruppen.map((row) => {
              const maxTotal = Math.max(...zielgruppen.map((z) => z.total), 1)
              return (
                <div key={row.zielgruppe} className="px-6 py-3 flex items-center gap-4">
                  <div className="w-40 shrink-0 truncate text-sm text-gray-800" style={{ fontFamily: 'var(--font-dm-sans)' }} title={row.zielgruppe}>
                    {row.zielgruppe}
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-800 rounded-full" style={{ width: `${(row.total / maxTotal) * 100}%` }} />
                  </div>
                  <div className="w-16 shrink-0 text-right text-sm text-gray-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {row.total}
                  </div>
                  <div className="w-24 shrink-0 text-right text-sm font-medium text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {fmtPct(row.conversionPercent)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
