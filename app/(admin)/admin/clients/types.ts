import type { ClientStatus, ProjectStatus } from '@/types/database'

export interface ClientProjectRef {
  id: string
  title: string
  status: ProjectStatus
}

export interface ClientRow {
  id: string
  number: string | null
  displayName: string
  companyName: string | null
  hasPortalAccess: boolean
  email: string | null
  phone: string | null
  website: string | null
  city: string | null
  status: ClientStatus
  projects: ClientProjectRef[]
}
