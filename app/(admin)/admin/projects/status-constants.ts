import type { ProjectStatus } from '@/types/database'

/** Pipeline-Reihenfolge — bestimmt Rail-Sortierung und Fortschrittsbalken auf der Karte. */
export const STATUS_ORDER: ProjectStatus[] = ['briefing', 'design', 'development', 'review', 'live']

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  briefing: 'Briefing',
  design: 'Design',
  development: 'Entwicklung',
  review: 'Review',
  live: 'Live',
}

export const STATUS_PILL: Record<ProjectStatus, string> = {
  briefing: 'bg-gray-100 text-gray-600',
  design: 'bg-blue-50 text-blue-700',
  development: 'bg-amber-50 text-amber-700',
  review: 'bg-purple-50 text-purple-700',
  live: 'bg-green-50 text-green-700',
}

export const STATUS_DOT: Record<ProjectStatus, string> = {
  briefing: 'bg-gray-400',
  design: 'bg-blue-500',
  development: 'bg-amber-500',
  review: 'bg-purple-500',
  live: 'bg-green-500',
}

export function stageIndex(status: ProjectStatus): number {
  return STATUS_ORDER.indexOf(status)
}
