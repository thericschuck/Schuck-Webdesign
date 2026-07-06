export interface GraphNode {
  id: string
  type: string
  label: string
  status?: string | null
  number?: string | null
  url: string
}

export interface GraphEdge {
  source: string
  target: string
  type: string
  weight?: number
}

export interface GraphPayload {
  nodes: GraphNode[]
  edges: GraphEdge[]
  truncated: boolean
  totalCount?: number
}

export const TYPE_LABEL: Record<string, string> = {
  client: 'Kunde',
  project: 'Projekt',
  document: 'Dokument',
  lead: 'Lead',
  offer: 'Angebot',
  invoice: 'Rechnung',
  todo: 'To-Do',
  meeting: 'Meeting',
  fact: 'Fakt',
  preference: 'Präferenz',
  note: 'Notiz',
  process: 'Prozess',
  product: 'Produkt',
  session: 'Session',
  contact: 'Kontakt',
}

export const TYPE_COLOR: Record<string, string> = {
  client: '#2563eb',
  project: '#7c3aed',
  document: '#f59e0b',
  lead: '#059669',
  offer: '#0891b2',
  invoice: '#dc2626',
  todo: '#64748b',
  meeting: '#ea580c',
  fact: '#a855f7',
  preference: '#ec4899',
  note: '#84cc16',
  process: '#06b6d4',
  product: '#f97316',
  session: '#6366f1',
  contact: '#14b8a6',
}

export function colorForType(type: string): string {
  return TYPE_COLOR[type] ?? '#9ca3af'
}

export function labelForType(type: string): string {
  return TYPE_LABEL[type] ?? type
}
