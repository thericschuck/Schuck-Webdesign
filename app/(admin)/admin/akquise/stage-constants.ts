import type { LeadStage } from '@/types/database'

export const STAGE_ORDER: LeadStage[] = ['erstkontakt', 'quali_call', 'closing_call', 'gewonnen', 'verloren']

export const STAGE_LABEL: Record<LeadStage, string> = {
  erstkontakt: 'Erstkontakt',
  quali_call: 'Quali-Call',
  closing_call: 'Closing-Call',
  gewonnen: 'Gewonnen',
  verloren: 'Verloren',
}
