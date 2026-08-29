import type { ProjectStatus } from '@/types/database'

export interface ProjectRow {
  id: string
  number: string | null
  title: string
  status: ProjectStatus
  startDate: string | null
  launchDate: string | null
  liveUrl: string | null
  clientId: string | null
  clientName: string | null
  clientCompany: string | null
  unreadCount: number
  openTodos: number
  overdueTodos: number
}
