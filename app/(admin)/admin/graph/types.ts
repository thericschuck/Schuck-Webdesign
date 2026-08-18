export interface GraphNodeDetail {
  label: string
  value: string
}

export interface GraphNode {
  id: string
  type: string
  label: string
  status?: string | null
  number?: string | null
  url: string
  /** Zusätzliche Stammdaten je Knotentyp (z.B. E-Mail/Telefon/Adresse bei Kunden) — optional,
   * nur befüllt wenn der jeweilige Knoten-Builder in app/api/admin/graph/route.ts welche liefert. */
  details?: GraphNodeDetail[]
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

// Lead-Knoten werden nicht einheitlich grün eingefärbt, sondern nach ihrem Funnel-Status
// (siehe leadNode() in app/api/admin/graph/route.ts — `status` trägt für current_stage=
// "erstkontakt" den akquise_ergebnis-Wert, sonst current_stage direkt). Bewusst als
// Farbverlauf angelegt: gedeckte/helle Töne für frühe, unentschiedene Signale (offen,
// nicht erreicht, Wiedervorlage), kräftigere Töne für die eigentlichen Funnel-Stages.
export const LEAD_STATUS_LABEL: Record<string, string> = {
  offen: 'Offen',
  nicht_erreicht: 'Nicht erreicht',
  wiedervorlage: 'Wiedervorlage',
  qualifiziert: 'Qualifiziert',
  kein_interesse: 'Kein Interesse',
  quali_call: 'Quali-Call',
  closing_call: 'Sales-Call',
  gewonnen: 'Gewonnen',
  verloren: 'Verloren',
}

export const LEAD_STATUS_COLOR: Record<string, string> = {
  offen: '#9ca3af',
  nicht_erreicht: '#fdba74',
  wiedervorlage: '#7dd3fc',
  qualifiziert: '#6ee7b7',
  kein_interesse: '#fca5a5',
  quali_call: '#3b82f6',
  closing_call: '#f59e0b',
  gewonnen: '#22c55e',
  verloren: '#f87171',
}

/** Farbe für einen konkreten Knoten (nicht nur den Typ) — bei Leads nach Funnel-Status
 * differenziert, sonst wie colorForType(). Für alle Coloring-Stellen im Graph verwenden;
 * die Typ-Legende im FilterPanel bleibt bewusst bei colorForType() (Filter läuft nach Typ). */
export function colorForNode(node: { type: string; status?: string | null }): string {
  if (node.type === 'lead' && node.status) {
    return LEAD_STATUS_COLOR[node.status] ?? colorForType(node.type)
  }
  return colorForType(node.type)
}

export function labelForLeadStatus(status: string): string {
  return LEAD_STATUS_LABEL[status] ?? status
}

/** hex (#rrggbb) → "rgba(r,g,b,alpha)" — used for glow/particle effects over the dark canvas. */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
