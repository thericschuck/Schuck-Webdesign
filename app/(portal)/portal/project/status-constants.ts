import type { ProjectStatus } from '@/types/database'

/** Geteilt zwischen der Server-Seite (page.tsx) und dem Client-Umschalter
 *  (ProjectSwitcher.tsx) — analog zu app/(admin)/admin/projects/status-constants.ts. */

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  briefing:    'Briefing',
  design:      'Design',
  development: 'Entwicklung',
  review:      'Review',
  live:        'Live',
}

export const STATUS_DOT: Record<ProjectStatus, string> = {
  briefing:    'bg-gray-400',
  design:      'bg-blue-500',
  development: 'bg-amber-500',
  review:      'bg-purple-500',
  live:        'bg-green-500',
}
