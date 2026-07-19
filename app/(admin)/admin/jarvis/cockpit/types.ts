// Analog zu app/(admin)/admin/graph/types.ts, aber für Agenten/Tools statt
// Business-Entitäten — eigener, kompatibler Typ statt Wiederverwendung von
// GraphNode/GraphEdge: Agenten/Tools brauchen deutlich reichere Detaildaten
// (System-Prompt, zugeordnete Tools, letzte Runs), die sich nicht sauber in
// das generische `details: {label,value}[]`-Feld der Business-Graph-Knoten
// pressen lassen.

export type RunStatus = 'queued' | 'running' | 'waiting_human' | 'succeeded' | 'failed' | 'cancelled'
export type Significance = 'trivial' | 'normal' | 'notable'
export type AgentStatus = 'active' | 'inactive'
export type CockpitNodeKind = 'orchestrator' | 'agent' | 'tool'

export interface CockpitToolRef {
  id: string
  slug: string
  name: string
}

export interface CockpitAgentRef {
  id: string
  slug: string
  name: string
}

export interface CockpitRunSummary {
  id: string
  status: RunStatus
  task: string | null
  startedAt: string | null
  endedAt: string | null
  significance: Significance
}

export interface CockpitNode {
  id: string
  kind: CockpitNodeKind
  label: string
  // Agent/Orchestrator:
  role?: string | null
  model?: string | null
  agentStatus?: AgentStatus
  systemPrompt?: string
  assignedTools?: CockpitToolRef[]
  recentRuns?: CockpitRunSummary[]
  // Tool:
  description?: string | null
  isIrreversible?: boolean
  usedByAgents?: CockpitAgentRef[]
}

export interface CockpitEdge {
  source: string
  target: string
  type: 'delegates_to' | 'uses_tool'
}

export interface CockpitPayload {
  nodes: CockpitNode[]
  edges: CockpitEdge[]
}

export interface RunHistoryRow {
  id: string
  agentLabel: string
  task: string | null
  status: RunStatus
  startedAt: string | null
  endedAt: string | null
  significance: Significance
}

export interface AgentStepRow {
  id: string
  seq: number
  type: 'reasoning' | 'llm' | 'tool_call' | 'tool_result' | 'handoff' | 'error'
  toolSlug: string | null
  input: unknown
  output: unknown
  status: 'running' | 'done' | 'error' | null
  durationMs: number | null
  retryCount: number | null
}

/**
 * agents.model hat keinen DB-Check-Constraint (nur `text not null default
 * 'claude-opus-4-8'`, siehe Migration 0017) — die erlaubte Liste wird deshalb hier
 * app-seitig geführt und von PATCH /api/admin/jarvis/agents/[id] UND dem Dropdown in
 * CockpitNodePanel.tsx genutzt (eine Quelle statt zwei getrennt gepflegte Listen).
 * Bewusst nur die drei aktuell empfohlenen Modell-Stufen, nicht jede historische Variante.
 */
export const ALLOWED_AGENT_MODELS = ['claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5'] as const

/** Vom Node-Panel bearbeitbare Agenten-Felder — Antwortform von GET/PATCH
 * /api/admin/jarvis/agents/[id] und PUT .../tools (jeweils der volle, aktuelle Stand nach
 * der Änderung, damit der Client in einem Schritt mergen kann statt Diffs zu bilden). */
export interface AgentDetailResponse {
  id: string
  role: string | null
  model: string
  agentStatus: AgentStatus
  systemPrompt: string
  assignedTools: CockpitToolRef[]
}

export interface AgentRunDetail {
  id: string
  agentLabel: string | null
  parentRunId: string | null
  trigger: string | null
  task: string | null
  status: RunStatus
  significance: Significance
  result: unknown
  error: unknown
  startedAt: string | null
  endedAt: string | null
  steps: AgentStepRow[]
}

/**
 * Eine eigene Farbe je Agenten-Rolle (agents.role) statt eines einheitlichen Blaus für
 * "alle Sub-Agenten" — Tools im Graphen erben die Farbe des Agenten, unter dem sie hängen
 * (siehe flow/computeLayout.ts, das diese Funktion beim Platzieren jedes Tool-Knotens für
 * dessen Eltern-Agenten aufruft). `executor` bekommt bewusst einen neutralen Grauton — laut
 * JARVIS_ARCHITEKTUR_PRINZIPIEN.md ein bislang unbenutztes Scaffolding-Relikt, kein
 * "echter" Sub-Agent wie die anderen 6.
 */
const AGENT_ROLE_COLOR: Record<string, string> = {
  design: '#d55181',
  code: '#4a90a4',
  seo: '#199e70',
  care: '#e66767',
  akquise: '#c98500',
  finanzen: '#3987e5',
  executor: '#8a8a85',
}
const DEFAULT_AGENT_COLOR = '#3987e5'

export function colorForAgentRole(role: string | null | undefined): string {
  if (!role) return DEFAULT_AGENT_COLOR
  return AGENT_ROLE_COLOR[role] ?? DEFAULT_AGENT_COLOR
}

const KIND_COLOR: Record<CockpitNodeKind, string> = {
  orchestrator: '#7F77DD',
  agent: DEFAULT_AGENT_COLOR,
  tool: '#c98500',
}

export function colorForNode(node: Pick<CockpitNode, 'kind' | 'agentStatus' | 'role'>): string {
  if (node.kind === 'agent') return colorForAgentRole(node.role)
  return KIND_COLOR[node.kind]
}

export const KIND_LABEL: Record<CockpitNodeKind, string> = {
  orchestrator: 'Orchestrator',
  agent: 'Sub-Agent',
  tool: 'Tool',
}

export const STATUS_LABEL: Record<RunStatus, string> = {
  queued: 'Wartet',
  running: 'Läuft',
  waiting_human: 'Wartet auf Bestätigung',
  succeeded: 'Erfolgreich',
  failed: 'Fehlgeschlagen',
  cancelled: 'Abgebrochen',
}

export const STATUS_COLOR: Record<RunStatus, string> = {
  queued: 'bg-gray-100 text-gray-600',
  running: 'bg-blue-50 text-blue-700',
  waiting_human: 'bg-amber-50 text-amber-700',
  succeeded: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

/** hex (#rrggbb) → "rgba(r,g,b,alpha)" — für Glow-Effekte über dem dunklen Canvas. */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(startedAt: string | null, endedAt: string | null, status: RunStatus): string {
  if (!startedAt) return '—'
  if (!endedAt) return status === 'running' ? 'läuft…' : '—'
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}min ${Math.round((ms % 60_000) / 1000)}s`
}

export function formatStepDuration(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
