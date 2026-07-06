import Link from 'next/link'
import { LeadStageSelect } from './LeadStageSelect'
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
}

export function LeadCard({ lead }: { lead: LeadCardData }) {
  const isDue = !!lead.wiedervorlage && new Date(lead.wiedervorlage) <= new Date()

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col gap-2">
      <Link href={`/admin/akquise/${lead.id}`} className="block group">
        <p className="text-[10px] text-gray-400 font-mono">{lead.lead_number}</p>
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

      <LeadStageSelect leadId={lead.id} currentStage={lead.current_stage} />
    </div>
  )
}
