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

// Dark-surface-tuned categorical palette (validated against #080808 — the hero background —
// via the dataviz skill's palette validator: lightness band, chroma floor and contrast all
// pass; the 8 core business-entity hues sit in the CVD "floor" band, which is legal because
// every node also carries a text label in the legend/tooltip — color is never the only signal).
export const TYPE_COLOR: Record<string, string> = {
  client: '#3987e5',
  project: '#9085e9',
  document: '#c98500',
  lead: '#199e70',
  offer: '#008300',
  invoice: '#e66767',
  todo: '#8a8a85',
  meeting: '#d95926',
  fact: '#d55181',
  preference: '#b56a9a',
  note: '#7a9e3a',
  process: '#4a90a4',
  product: '#b8703a',
  session: '#6b6bc4',
  contact: '#4a9e94',
}

export function colorForType(type: string): string {
  return TYPE_COLOR[type] ?? '#9ca3af'
}

export function labelForType(type: string): string {
  return TYPE_LABEL[type] ?? type
}

/** hex (#rrggbb) → "rgba(r,g,b,alpha)" — used for glow/particle effects over the dark canvas. */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
