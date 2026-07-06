'use client'

import { useTransition } from 'react'
import { updateLeadStage } from './actions'
import { STAGE_LABEL, STAGE_ORDER } from './stage-constants'
import type { LeadStage } from '@/types/database'

export function LeadStageSelect({ leadId, currentStage }: { leadId: string; currentStage: LeadStage }) {
  const [isPending, startTransition] = useTransition()

  return (
    <select
      value={currentStage}
      disabled={isPending}
      onChange={(e) => {
        const value = e.target.value as LeadStage
        startTransition(() => {
          void updateLeadStage(leadId, value)
        })
      }}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none focus:border-gray-400 disabled:opacity-50"
      style={{ fontFamily: 'var(--font-dm-sans)' }}
    >
      {STAGE_ORDER.map((stage) => (
        <option key={stage} value={stage}>
          {STAGE_LABEL[stage]}
        </option>
      ))}
    </select>
  )
}
