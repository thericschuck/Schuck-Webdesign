import dagre from 'dagre'
import { MarkerType, type Edge, type Node } from '@xyflow/react'
import { colorForNode, type CockpitEdge, type CockpitNode, type CockpitNodeKind } from '../types'
import type { FlowNodeData } from './nodeTypes'

/** Zusätzliche, rein client-seitige Knotenarten für den Bestätigungs-Zweig (siehe unten) —
 * existieren nicht in /api/admin/helm/cockpit, nur als Layout-/Render-Diskriminator. */
export type FlowNodeKind = CockpitNodeKind | 'condition' | 'pending' | 'direct'

export type FlowEdgeData = { kind: CockpitEdge['type'] | 'branch-yes' | 'branch-no' } & Record<string, unknown>

const NODE_SIZE: Record<FlowNodeKind, { width: number; height: number }> = {
  orchestrator: { width: 260, height: 76 },
  agent: { width: 232, height: 70 },
  tool: { width: 192, height: 48 },
  condition: { width: 200, height: 64 },
  pending: { width: 244, height: 64 },
  direct: { width: 216, height: 64 },
}

const TOOL_GAP = 14 // Lücke zwischen gestapelten Tool-Karten desselben Agenten
const AGENT_GAP = 34 // Lücke zwischen den Höhen-"Footprints" zweier Agenten
const TOOL_RANK_GAP = 110 // horizontaler Abstand Agenten-Spalte -> Tool-Spalte
const BRANCH_GAP = 110 // vertikaler Abstand Orchestrator-Mitte -> Bestätigungs-Zweig
const RANK_GAP = 170 // horizontaler Abstand Orchestrator -> Agenten-Spalte / -> Zweig

// Bestätigungs-Zweig ist bewusst NICHT Teil einer Agenten-Farbfamilie (er hängt an keinem
// bestimmten Sub-Agenten) — eigene, feste Farben statt eines Agenten-Akzents.
const NEUTRAL_DELEGATE_COLOR = '#8f88e8'
const BRANCH_YES_COLOR = '#f0b429'
const BRANCH_NO_COLOR = '#6b7280'

/** IDs der synthetischen Bestätigungs-Zweig-Knoten — `is_irreversible → pending_actions`
 * ist im echten Code kein Graph-Knoten, sondern ein `if (tool.requiresConfirmation)` in
 * lib/helm/core/run.ts. Wird hier als eigenständiger, statischer Zweig direkt am
 * Orchestrator nachgebildet — unabhängig von der Sub-Agenten-Delegation (zwei getrennte
 * Entscheidungen des Orchestrators, keine Kette). */
export const CONDITION_NODE_ID = 'condition:confirm'
export const PENDING_NODE_ID = 'pending:confirm'
export const DIRECT_NODE_ID = 'direct:confirm'

export interface ComputedLayout {
  nodes: Node<FlowNodeData>[]
  edges: Edge<FlowEdgeData>[]
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  kind: FlowEdgeData['kind'],
  color: string,
  options?: { label?: string; dashed?: boolean }
): Edge<FlowEdgeData> {
  return {
    id,
    source,
    target,
    type: 'smoothstep',
    label: options?.label,
    markerEnd: { type: MarkerType.ArrowClosed, color },
    style: { stroke: color, strokeWidth: options?.dashed ? 1.3 : 1.6, ...(options?.dashed ? { strokeDasharray: '4 3' } : {}) },
    data: { kind },
  }
}

/** Eindeutige Flow-Node-ID für einen Tool-Knoten UNTER einem bestimmten Agenten — siehe
 * Kommentar bei toolsByAgent unten dazu, warum Tools pro nutzendem Agenten dupliziert
 * werden statt einen einzigen, geteilten Knoten zu haben. */
function toolInstanceId(toolId: string, agentId: string): string {
  return `${toolId}@${agentId}`
}

/**
 * Reines Layout — keine Live-Statusdaten (die merged CockpitExplorer.tsx pro Render separat
 * rein, damit ein Realtime-Event nicht jedes Mal neu layouten muss).
 *
 * Bewusst KEIN einziger dagre-Durchlauf über den ganzen Graphen: dagre kennt nur die
 * Kanten, nicht dass ein Agent mit 8 Tools (Care-Agent) und einer mit 2 (Finanzen-Agent)
 * fachlich gleichrangig sind — im gemischten Graphen zieht dagre die Agenten-Spalte
 * dadurch extrem ungleichmäßig auseinander (siehe Screenshot-Feedback: riesige Leerräume).
 * Stattdessen: dagre nur für die Reihenfolge/Spalten der Agenten, danach eigene, exakt
 * kontrollierte Y-Stapelung — jeder Agent bekommt genau so viel vertikalen Platz, wie sein
 * eigener Tool-Fächer braucht, nicht mehr und nicht weniger.
 *
 * Farben: jeder Agent bekommt über colorForNode()/AGENT_ROLE_COLOR (types.ts) eine eigene
 * Farbe statt eines einheitlichen Blaus. Tool-Knoten übernehmen die Farbe des Agenten, unter
 * dem sie physisch hängen (toolsByAgent unten) — der Glow eines Tools zeigt so an, zu
 * welchem Agenten es gehört, auch ohne die Verbindungslinie zu verfolgen.
 */
export function computeLayout(cockpitNodes: CockpitNode[], cockpitEdges: CockpitEdge[]): ComputedLayout {
  const orchestrator = cockpitNodes.find((n) => n.kind === 'orchestrator')
  const agentNodes = cockpitNodes.filter((n) => n.kind === 'agent')
  const toolNodes = cockpitNodes.filter((n) => n.kind === 'tool')
  const delegateEdges = cockpitEdges.filter((e) => e.type === 'delegates_to')
  const toolEdges = cockpitEdges.filter((e) => e.type === 'uses_tool')

  const orchestratorAccent = orchestrator ? colorForNode(orchestrator) : '#7F77DD'
  const accentByAgentId = new Map<string, string>(agentNodes.map((a) => [a.id, colorForNode(a)]))

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 22, ranksep: RANK_GAP })
  if (orchestrator) g.setNode(orchestrator.id, NODE_SIZE.orchestrator)
  for (const a of agentNodes) g.setNode(a.id, NODE_SIZE.agent)
  for (const e of delegateEdges) g.setEdge(e.source, e.target)
  dagre.layout(g)

  // Welche Tools gehören zu welchem Agenten? Ein Tool mit mehreren nutzenden Agenten (z.B.
  // pagespeed_check bei SEO- und Care-Agent) bekommt bewusst EINE Karte PRO nutzendem Agenten
  // statt eines einzigen geteilten Knotens — sonst müsste eine Kante quer durch fremde
  // Agenten-Spalten laufen, um den "gewinnenden" Agenten zu erreichen (sah unordentlich aus,
  // siehe Screenshot-Feedback). Jede Agenten-Spalte bleibt so vollständig in sich geschlossen.
  const toolsByAgent = new Map<string, CockpitNode[]>()
  for (const e of toolEdges) {
    const tool = toolNodes.find((t) => t.id === e.target)
    if (!tool) continue
    if (!toolsByAgent.has(e.source)) toolsByAgent.set(e.source, [])
    toolsByAgent.get(e.source)!.push(tool)
  }

  const toolStep = NODE_SIZE.tool.height + TOOL_GAP
  const orderedAgents = [...agentNodes].sort((a, b) => g.node(a.id).y - g.node(b.id).y)

  const agentY = new Map<string, number>()
  let cursorY = 0
  for (const a of orderedAgents) {
    const toolCount = toolsByAgent.get(a.id)?.length ?? 0
    const footprint = Math.max(NODE_SIZE.agent.height, toolCount * toolStep - TOOL_GAP)
    cursorY += footprint / 2
    agentY.set(a.id, cursorY)
    cursorY += footprint / 2 + AGENT_GAP
  }

  const nodes: Node<FlowNodeData>[] = []
  const edges: Edge<FlowEdgeData>[] = []

  function place(id: string, kind: FlowNodeKind, label: string, cockpitNode: CockpitNode | null, x: number, y: number, accent: string) {
    const size = NODE_SIZE[kind]
    nodes.push({
      id,
      type: kind,
      position: { x: x - size.width / 2, y: y - size.height / 2 },
      data: { cockpitNode, label, runStatus: 'idle', accent },
      // Kein `draggable: false` mehr hier — das würde den `nodesDraggable`-Prop auf
      // <ReactFlow> in CockpitExplorer.tsx überschreiben (Node-Level gewinnt gegen den
      // globalen Prop) und Drag & Drop komplett verhindern, egal was dort gesetzt ist.
    })
  }

  const agentX = agentNodes.length > 0 ? g.node(agentNodes[0].id).x : (orchestrator ? g.node(orchestrator.id).x : 0) + RANK_GAP
  const agentYs = [...agentY.values()]
  const orchestratorY = agentYs.length > 0 ? (Math.min(...agentYs) + Math.max(...agentYs)) / 2 : 0
  const orchestratorX = orchestrator ? g.node(orchestrator.id).x : 0

  if (orchestrator) place(orchestrator.id, 'orchestrator', orchestrator.label, orchestrator, orchestratorX, orchestratorY, orchestratorAccent)
  for (const a of agentNodes) place(a.id, 'agent', a.label, a, agentX, agentY.get(a.id)!, accentByAgentId.get(a.id)!)
  for (const e of delegateEdges) {
    edges.push(makeEdge(`${e.source}->${e.target}`, e.source, e.target, 'delegates_to', accentByAgentId.get(e.target) ?? orchestratorAccent))
  }

  const toolRankX = agentX + NODE_SIZE.agent.width / 2 + TOOL_RANK_GAP + NODE_SIZE.tool.width / 2
  for (const [agentId, tools] of toolsByAgent) {
    const y = agentY.get(agentId)
    if (y == null) continue
    const agentAccent = accentByAgentId.get(agentId) ?? '#c98500'
    let toolY = y - ((tools.length - 1) * toolStep) / 2
    for (const tool of tools) {
      place(toolInstanceId(tool.id, agentId), 'tool', tool.label, tool, toolRankX, toolY, agentAccent)
      toolY += toolStep
    }
  }
  for (const e of toolEdges) {
    const instanceId = toolInstanceId(e.target, e.source)
    edges.push(makeEdge(`${e.source}->${instanceId}`, e.source, instanceId, 'uses_tool', accentByAgentId.get(e.source) ?? '#c98500'))
  }

  // Der Bestätigungs-Zweig sitzt UNTER dem gesamten Agenten/Tool-Baum, nicht nur "etwas
  // unterhalb des Orchestrators" — sonst landet er (wie im ersten Anlauf beobachtet) mitten
  // im Baum, sobald ein Agent mit vielen Tools (z.B. Care-Agent) die Gesamthöhe dominiert.
  if (orchestrator) {
    const contentBottomY = nodes.reduce((max, n) => Math.max(max, n.position.y + NODE_SIZE[n.type as FlowNodeKind].height), 0)
    const branchY = contentBottomY + BRANCH_GAP
    const conditionX = agentX
    const endpointX = toolRankX

    place(CONDITION_NODE_ID, 'condition', 'Bestätigungspflichtig?', null, conditionX, branchY, BRANCH_YES_COLOR)
    place(PENDING_NODE_ID, 'pending', 'Wartet auf Bestätigung (Eric)', null, endpointX, branchY - (NODE_SIZE.pending.height + TOOL_GAP) / 2, BRANCH_YES_COLOR)
    place(DIRECT_NODE_ID, 'direct', 'Direkte Ausführung', null, endpointX, branchY + (NODE_SIZE.direct.height + TOOL_GAP) / 2, BRANCH_NO_COLOR)

    edges.push(
      makeEdge(`${orchestrator.id}->${CONDITION_NODE_ID}`, orchestrator.id, CONDITION_NODE_ID, 'delegates_to', NEUTRAL_DELEGATE_COLOR),
      makeEdge(`${CONDITION_NODE_ID}->${PENDING_NODE_ID}`, CONDITION_NODE_ID, PENDING_NODE_ID, 'branch-yes', BRANCH_YES_COLOR, { label: 'Ja' }),
      makeEdge(`${CONDITION_NODE_ID}->${DIRECT_NODE_ID}`, CONDITION_NODE_ID, DIRECT_NODE_ID, 'branch-no', BRANCH_NO_COLOR, { label: 'Nein', dashed: true })
    )
  }

  return { nodes, edges }
}
