import Link from 'next/link'
import { LeadStageSelect } from './LeadStageSelect'
import { STAGE_LABEL } from './stage-constants'
import type { LeadPrioritaet, LeadStage } from '@/types/database'

const PRIORITY_LABEL: Record<LeadPrioritaet, string> = { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' }
const PRIORITY_COLOR: Record<LeadPrioritaet, string> = {
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-600',
  low: 'bg-gray-100 text-gray-500',
}

export interface LeadCardData {
  id: string
  lead_number: string
  firmenname: string
  zielgruppe: string | null
  prioritaet: LeadPrioritaet
  current_stage: LeadStage
  wiedervorlage: string | null
  sheet_lead_id: string | null
}

const STAGE_BADGE: Record<LeadStage, string> = {
  erstkontakt: 'bg-gray-100 text-gray-600',
  quali_call: 'bg-blue-50 text-blue-700',
  closing_call: 'bg-amber-50 text-amber-700',
  gewonnen: 'bg-green-50 text-green-700',
  verloren: 'bg-red-50 text-red-700',
}

export function LeadCard({ lead, isNew }: { lead: LeadCardData; isNew?: boolean }) {
  const isDue = !!lead.wiedervorlage && new Date(lead.wiedervorlage) <= new Date()
  const isFromSheet = !!lead.sheet_lead_id

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col gap-2">
      <Link href={`/admin/akquise/${lead.id}`} className="block group">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] text-gray-400 font-mono">{lead.lead_number}</p>
          {isNew && (
            <span className="text-[9px] px-1 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 leading-none">
              NEU
            </span>
          )}
        </div>
        <p
          className="text-sm font-medium text-gray-900 truncate group-hover:underline"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {lead.firmenname}
        </p>
        {lead.zielgruppe && (
          <p className="text-xs text-gray-400 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {lead.zielgruppe}
          </p>
        )}
      </Link>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[lead.prioritaet]}`}
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {PRIORITY_LABEL[lead.prioritaet]}
        </span>
        {lead.wiedervorlage && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDue ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            WV: {new Date(lead.wiedervorlage).toLocaleDateString('de-DE')}
          </span>
        )}
      </div>

      {isFromSheet ? (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium self-start ${STAGE_BADGE[lead.current_stage]}`}
          style={{ fontFamily: 'var(--font-dm-sans)' }}
          title="Aus dem Google Sheet synchronisiert — Bearbeitung dort"
        >
          {STAGE_LABEL[lead.current_stage]}
        </span>
      ) : (
        <LeadStageSelect leadId={lead.id} currentStage={lead.current_stage} />
      )}
    </div>
  )
}
