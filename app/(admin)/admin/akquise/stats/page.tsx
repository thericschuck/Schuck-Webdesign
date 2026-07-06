import Link from 'next/link'
import * as akquiseDomain from '@/lib/domain/akquise'
import { STAGE_LABEL } from '../stage-constants'
import type { LeadStage } from '@/types/database'

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

function fmtPct(value: number | null) {
  return value == null ? '—' : `${value}%`
}

export default async function AkquiseStatsPage() {
  const stats = await akquiseDomain.getFunnelStats()

  const funnelSteps = [
    { label: 'Erstkontakt (alle Leads)', value: stats.total_leads, max: stats.total_leads },
    { label: 'Quali-Call erreicht', value: stats.reached_quali_call, max: stats.total_leads },
    { label: 'Closing-Call erreicht', value: stats.reached_closing_call, max: stats.total_leads },
    { label: 'Gewonnen', value: stats.gewonnen, max: stats.total_leads },
  ]

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/akquise" className="hover:text-gray-600 transition-colors">
          Akquise
        </Link>
        <span>/</span>
        <span className="text-gray-700">Statistik</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Funnel-Statistik
        </h1>
        <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {stats.total_leads} Leads insgesamt
        </p>
      </div>

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
                    className={`h-full rounded-full ${['bg-gray-400', 'bg-blue-500', 'bg-amber-500', 'bg-green-500'][i]}`}
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
    </div>
  )
}
