'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  applyNodeChanges,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
  type Viewport,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { FlickeringGrid } from '@/components/ui/flickering-grid'
import { CockpitNodePanel } from './CockpitNodePanel'
import { HistoryPanel } from './HistoryPanel'
import { CONDITION_NODE_ID, DIRECT_NODE_ID, PENDING_NODE_ID, computeLayout, type FlowEdgeData } from './flow/computeLayout'
import { NetworkBackground } from './flow/NetworkBackground'
import { nodeTypes, type FlowNodeData } from './flow/nodeTypes'
import type { RunVisualStatus } from './flow/StatusBadge'
import { colorForNode, KIND_LABEL, type CockpitEdge, type CockpitNode, type CockpitPayload } from './types'
import { useAgentRunsRealtime, type AgentRunChangeRow } from './useAgentRunsRealtime'

const LEGEND: { kind: CockpitNode['kind']; label: string }[] = [
  { kind: 'orchestrator', label: KIND_LABEL.orchestrator },
  { kind: 'agent', label: KIND_LABEL.agent },
  { kind: 'tool', label: KIND_LABEL.tool },
]

// Wie lange ein Knoten nach Abschluss seines Runs noch "done"/"error" zeigt, bevor er auf
// "idle" zurückfällt — ersetzt das alte, canvas-basierte Fade-out aus der Force-Graph-Ära
// (siehe git-Historie) durch einen einfachen Timer auf echtem React-State.
const DONE_FADE_MS = 4000
const ERROR_FADE_MS = 6000

// Füllt den Content-Bereich randlos, lässt die Admin-Sidebar (links, z-40) und die mobile
// Topbar (oben, z-50) aber sichtbar/erreichbar — exakt dasselbe Muster wie
// app/(admin)/admin/graph/GraphExplorer.tsx, für ein konsistentes "Vollbild-Tool"-Gefühl.
const shellClass = 'fixed inset-x-0 bottom-0 top-14 md:top-0 md:left-60 overflow-hidden bg-[#080808]'

export function CockpitExplorer() {
  const [nodes, setNodes] = useState<CockpitNode[]>([])
  const [edges, setEdges] = useState<CockpitEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<CockpitNode | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  // Laufstatus je Agenten-Knoten (agent:<id> -> idle/running/error/done) — gespeist 1:1 aus
  // useAgentRunsRealtime.ts (unverändert). Echtes React-State statt Canvas-Ref, weil jeder
  // Knoten jetzt eine echte React-Komponente ist, die auf Props reagiert, statt bei jedem
  // Frame neu auf ein Canvas gezeichnet zu werden.
  const [statusByNodeId, setStatusByNodeId] = useState<Map<string, RunVisualStatus>>(new Map())
  // true, solange der aktuellste Orchestrator-Run auf 'waiting_human' steht — speist den
  // Bestätigungs-Zweig (ConditionNode/PendingNode), siehe flow/computeLayout.ts. Nur der
  // Orchestrator kann diesen Status je erreichen (Sub-Agenten dürfen laut buildScopedRegistry
  // keine bestätigungspflichtigen Tools bekommen).
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)

  // Spiegelt Pan/Zoom-Änderungen des React-Flow-Viewports relativ zum Stand direkt nach
  // fitView auf die Ambient-Hintergrundebenen — Ref statt State, damit onMove (feuert bei
  // jedem Drag-/Zoom-Frame) keinen React-Re-Render auslöst, sondern nur eine einzelne
  // CSS-transform-Zuweisung. bgBaselineRef hält den fitView-Viewport als Referenzpunkt: die
  // Differenz dazu ist zu Beginn 0/1, der Hintergrund startet also exakt wie im Ladebildschirm
  // (identity transform) und bewegt sich erst mit weiterem User-Pan/Zoom.
  const bgLayerRef = useRef<HTMLDivElement>(null)
  const bgBaselineRef = useRef<Viewport>({ x: 0, y: 0, zoom: 1 })

  // Pausiert die beiden Ambient-Canvas-Animationen (FlickeringGrid, NetworkBackground)
  // während aktivem Node- oder Pane-Drag — diese laufen sonst kontinuierlich und ihr
  // Neuzeichnen konkurriert währenddessen spürbar mit React Flows Drag-Reflow. Nur zwei
  // State-Updates je Drag-Geste (Start/Ende), kein Re-Render pro Frame.
  const [bgPaused, setBgPaused] = useState(false)

  const applyBgTransform = useCallback((viewport: Viewport) => {
    const base = bgBaselineRef.current
    const scale = viewport.zoom / base.zoom
    const x = viewport.x - scale * base.x
    const y = viewport.y - scale * base.y
    const el = bgLayerRef.current
    if (el) el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
  }, [])

  const flowInstanceRef = useRef<ReactFlowInstance<Node<FlowNodeData>, Edge<FlowEdgeData>> | null>(null)
  const fadeTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const nodesByIdForRealtimeRef = useRef<Map<string, CockpitNode>>(new Map())
  const orchestratorAgentIdRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/helm/cockpit')
      .then((res) => {
        if (!res.ok) throw new Error(`Cockpit-Daten konnten nicht geladen werden (${res.status}).`)
        return res.json() as Promise<CockpitPayload>
      })
      .then((payload) => {
        if (cancelled) return
        setNodes(payload.nodes)
        setEdges(payload.edges)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unbekannter Fehler.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const nodesById = useMemo(() => {
    const map = new Map<string, CockpitNode>()
    for (const n of nodes) map.set(n.id, n)
    return map
  }, [nodes])

  // Für die Tool-Zuordnungs-Checkliste im Bearbeiten-Formular des Node-Panels — die
  // vollständige Tool-Liste ist ohnehin schon Teil des geladenen Graphen, kein eigener Fetch nötig.
  const allTools = useMemo(() => nodes.filter((n) => n.kind === 'tool'), [nodes])

  // Realtime-Handler liest diese Refs statt direkt nodesById/nodes aus dem Closure — die
  // Callback-Referenz von useAgentRunsRealtime bleibt dadurch stabil, während der Inhalt
  // nach jedem Fetch aktuell ist (gleiches Muster wie vor dem Umbau).
  useEffect(() => {
    nodesByIdForRealtimeRef.current = nodesById
    const orchestrator = nodes.find((n) => n.kind === 'orchestrator')
    orchestratorAgentIdRef.current = orchestrator ? orchestrator.id.replace(/^agent:/, '') : null
  }, [nodesById, nodes])

  /** Nach einer Bearbeitung im Node-Panel: aktualisiert sowohl den Graph-State (damit ein
   * Re-Öffnen des Panels den neuen Stand zeigt) als auch das aktuell offene Panel selbst —
   * kein voller Re-Fetch von /api/admin/helm/cockpit, der das Layout neu würfeln und alle
   * Karten "springen" lassen würde. */
  function handleNodeUpdate(updated: CockpitNode) {
    setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
    setSelectedNode(updated)
  }

  const handleAgentRunChange = useCallback((row: AgentRunChangeRow) => {
    if (!row.agent_id) return
    const nodeId = `agent:${row.agent_id}`
    // Run für einen Agenten, der (noch) nicht Teil des geladenen Graphen ist — z.B. eine
    // Race Condition kurz nach dem initialen Fetch. Kein Grund zum Absturz, einfach ignorieren.
    if (!nodesByIdForRealtimeRef.current.has(nodeId)) return

    const existingTimer = fadeTimersRef.current.get(nodeId)
    if (existingTimer) {
      clearTimeout(existingTimer)
      fadeTimersRef.current.delete(nodeId)
    }

    let next: RunVisualStatus
    if (row.status === 'running' || row.status === 'queued') next = 'running'
    else if (row.status === 'failed') next = 'error'
    else if (row.status === 'succeeded') next = 'done'
    // 'waiting_human'/'cancelled': der Agenten-Knoten selbst gilt wieder als "idle" — das
    // Warten-auf-Bestätigung-Signal lebt separat im Bestätigungs-Zweig unten, weil nur der
    // Orchestrator diesen Status je erreicht.
    else next = 'idle'

    setStatusByNodeId((prev) => {
      const copy = new Map(prev)
      copy.set(nodeId, next)
      return copy
    })

    if (next === 'done' || next === 'error') {
      const timer = setTimeout(
        () => {
          setStatusByNodeId((prev) => {
            const copy = new Map(prev)
            if (copy.get(nodeId) === next) copy.set(nodeId, 'idle')
            return copy
          })
          fadeTimersRef.current.delete(nodeId)
        },
        next === 'error' ? ERROR_FADE_MS : DONE_FADE_MS
      )
      fadeTimersRef.current.set(nodeId, timer)
    }

    if (row.agent_id === orchestratorAgentIdRef.current) {
      setAwaitingConfirmation(row.status === 'waiting_human')
    }
  }, [])

  const { connectionStatus } = useAgentRunsRealtime(handleAgentRunChange)

  useEffect(() => {
    const timers = fadeTimersRef.current
    return () => {
      for (const timer of timers.values()) clearTimeout(timer)
    }
  }, [])

  // Reines Layout (Positionen) — wird nur neu berechnet, wenn sich Knoten/Kanten selbst
  // ändern (initialer Fetch, Bearbeitung im Panel), NICHT bei jedem Realtime-Status-Tick.
  const layout = useMemo(() => computeLayout(nodes, edges), [nodes, edges])

  // Positionen als eigenes State statt direkt aus `layout` gerendert — dadurch lassen sich
  // Knoten frei verschieben (interaktiver Graph statt starrem Diagramm). Ein echter
  // Daten-Refresh (neues `layout`-Objekt) setzt die Positionen zurück, ein Realtime-
  // Status-Tick tut es nicht (der ändert nur `data.runStatus`, nicht `layout` selbst).
  const [flowNodeState, setFlowNodeState] = useState<Node<FlowNodeData>[]>([])
  useEffect(() => {
    setFlowNodeState(layout.nodes)
  }, [layout])

  const onNodesChange = useCallback((changes: NodeChange<Node<FlowNodeData>>[]) => {
    setFlowNodeState((nds) => applyNodeChanges(changes, nds))
  }, [])

  const flowNodes = useMemo(
    () =>
      flowNodeState.map((n) => {
        if (n.id === CONDITION_NODE_ID || n.id === PENDING_NODE_ID) {
          return { ...n, data: { ...n.data, runStatus: (awaitingConfirmation ? 'running' : 'idle') as RunVisualStatus } }
        }
        if (n.id === DIRECT_NODE_ID) return n
        return { ...n, data: { ...n.data, runStatus: statusByNodeId.get(n.id) ?? 'idle' } }
      }),
    [flowNodeState, statusByNodeId, awaitingConfirmation]
  )

  const flowEdges = useMemo(
    () =>
      layout.edges.map((e) => {
        if (e.id === `${CONDITION_NODE_ID}->${PENDING_NODE_ID}`) return { ...e, animated: awaitingConfirmation }
        if (e.data?.kind === 'delegates_to') return { ...e, animated: statusByNodeId.get(e.target) === 'running' }
        if (e.data?.kind === 'uses_tool') return { ...e, animated: statusByNodeId.get(e.source) === 'running' }
        return e
      }),
    [layout.edges, statusByNodeId, awaitingConfirmation]
  )

  /** Node-Panel und Historie sind gegenseitig exklusiv — beide sind rechte Overlays; ohne
   * das würde ein offenes Node-Panel die Historie optisch komplett verdecken (Bug-Report:
   * "sobald man auf einen Knoten gedrückt hat, kann man die Historie nicht mehr einsehen"). */
  function openNodePanel(node: CockpitNode) {
    setHistoryOpen(false)
    setSelectedNode(node)
  }

  function openHistory() {
    setSelectedNode(null)
    setHistoryOpen(true)
  }

  /** Springt von einer Referenz im Node-Panel (z.B. "Zugeordnete Tools") zum Knoten im
   * Diagramm — analog zur alten selectNodeById(), nur jetzt über die React-Flow-Instanz
   * statt fg.centerAt(). */
  function selectNodeById(id: string) {
    const match = nodesById.get(id)
    if (!match) return
    openNodePanel(match)
    // Tool-Knoten sind jetzt pro nutzendem Agenten dupliziert (eigene Flow-Node-ID
    // `toolId@agentId`, siehe flow/computeLayout.ts) — deshalb zusätzlich über
    // data.cockpitNode.id matchen, nicht nur über die (bei Tools nicht mehr eindeutige) id.
    const flowNode = flowNodes.find((n) => n.id === id || n.data.cockpitNode?.id === id)
    const instance = flowInstanceRef.current
    if (instance && flowNode) {
      const width = flowNode.measured?.width ?? 200
      const height = flowNode.measured?.height ?? 60
      instance.setCenter(flowNode.position.x + width / 2, flowNode.position.y + height / 2, { zoom: 1, duration: 500 })
    }
  }

  if (error) {
    return (
      <div className={`${shellClass} flex items-center justify-center`}>
        <p className="text-sm text-red-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {error}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Überschreibt React Flows Standard-Kontrollleiste (hell) auf das dunkle Cockpit-Theme
          — @xyflow/react liefert keine Theme-Variante, nur CSS-Variablen/Klassen zum Anpassen. */}
      <style>{`
        .helm-cockpit-controls.react-flow__controls button {
          background: #1a1a1a;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          fill: rgba(255,255,255,0.6);
        }
        .helm-cockpit-controls.react-flow__controls button:hover {
          background: #242424;
        }
        .helm-cockpit-minimap.react-flow__minimap {
          background: #111111;
          border-radius: 12px;
          overflow: hidden;
        }
        .react-flow__edge-text { fill: rgba(255,255,255,0.7); font-size: 10px; }
        .react-flow__edge-textbg { fill: #0c0c0c; }

        /* React Flow setzt im colorMode="dark" eine eigene, deckende Hintergrundfarbe auf
           die Pane — die würde FlickeringGrid/NetworkBackground darunter komplett verdecken,
           sobald der Graph (statt des Loading-Textes) gemountet ist. Transparent machen,
           damit beide Ambient-Layer durch den gesamten Graph-Bereich sichtbar bleiben. */
        .helm-cockpit-flow.react-flow,
        .helm-cockpit-flow .react-flow__pane,
        .helm-cockpit-flow .react-flow__viewport {
          background: transparent;
        }

        /* Einblend-Animation beim ersten Mounten eines Knotens (Graph "materialisiert" sich
           beim Laden statt einfach dazustehen) und eine dezente, dauerhafte "Atem"-Animation
           im Ruhezustand, damit der Graph auch ganz ohne aktiven Run nicht komplett
           still wirkt — beide rein deko, keine fachliche Bedeutung. */
        @keyframes cockpit-node-in {
          from { opacity: 0; transform: scale(0.86); }
          to { opacity: 1; transform: scale(1); }
        }
        .cockpit-node-in { animation: cockpit-node-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards; }

        @keyframes cockpit-breathe {
          0%, 100% { opacity: 0.18; }
          50% { opacity: 0.5; }
        }
        .cockpit-breathe { animation: cockpit-breathe 3.4s ease-in-out infinite; }
      `}</style>

      <div className={shellClass}>
        {/* Ambient-Hintergrund in eigenem, transform-gebundenem Layer: die Transform übernimmt
            exakt den React-Flow-Viewport (x/y/zoom), damit Pan/Zoom auf Hintergrund und Graph
            gemeinsam wirken statt nur auf den Graph. transformOrigin '0 0' entspricht dem
            Default von .react-flow__viewport. */}
        <div
          ref={bgLayerRef}
          aria-hidden
          className="absolute inset-0 pointer-events-none will-change-transform"
          style={{ transformOrigin: '0 0' }}
        >
          {/* Sehr dezentes, statisches Flicker-Raster hinter dem Punktnetz — reine
              Textur/Atmosphäre auf niedrigster Opacity, keine fachliche Bedeutung. */}
          <FlickeringGrid
            className="absolute inset-0"
            squareSize={3}
            gridGap={8}
            color="#7F77DD"
            maxOpacity={0.08}
            flickerChance={0.06}
            paused={bgPaused}
          />
          <NetworkBackground paused={bgPaused} />

          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(127,119,221,0.10) 0%, transparent 70%)' }}
          />
        </div>

        {/* Schwebende Kontrollleiste statt einer Tab-Leiste — Chat/Cockpit-Umschalter, Legende
            und Historie-Knopf in einer Zeile, damit der Graph darunter den ganzen Rest der
            Seite bekommt. */}
        <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-1 rounded-lg bg-white/5 backdrop-blur-md border border-white/8">
            <Link
              href="/admin/helm"
              className="px-3 py-1.5 rounded-md text-xs font-medium text-white/50 hover:text-white transition-colors"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Chat
            </Link>
            <span
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#7F77DD] text-white"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Cockpit
            </span>
          </div>

          <div className="flex items-center gap-4 px-3 py-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/8">
            {LEGEND.map(({ kind, label }) => (
              <div key={kind} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: colorForNode({ kind, agentStatus: 'active' }), boxShadow: `0 0 6px ${colorForNode({ kind, agentStatus: 'active' })}` }}
                />
                <span className="text-xs text-white/60" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={openHistory}
            className="px-3 py-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/8 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Historie
          </button>

          <button
            onClick={() => setFlowNodeState(layout.nodes)}
            title="Verschobene Knoten wieder ins automatische Layout einordnen"
            className="px-3 py-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/8 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Layout zurücksetzen
          </button>

          {/* Dezenter Hinweis statt einer harten Fehlermeldung — der Supabase-Client verbindet
              Realtime-Channels bei einem Abbruch normalerweise selbst neu, dieser Banner ist
              nur die sichtbare Rückmeldung dafür, solange die Verbindung wirklich fehlt. */}
          {connectionStatus === 'lost' && (
            <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/25">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-amber-300" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Verbindung verloren — verbinde erneut…
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-white/40" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Cockpit wird geladen…
            </p>
          </div>
        ) : (
          <ReactFlow<Node<FlowNodeData>, Edge<FlowEdgeData>>
            className="helm-cockpit-flow"
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onInit={(instance) => {
              flowInstanceRef.current = instance
              // fitView berechnet den initialen Viewport erst nach diesem Callback — ein
              // rAF-Tick später steht instance.getViewport() bereit. Als Baseline gesetzt,
              // bleibt der Hintergrund optisch identisch zum Ladebildschirm (Differenz 0/1)
              // und bewegt sich erst mit weiterem Pan/Zoom des Nutzers.
              requestAnimationFrame(() => {
                bgBaselineRef.current = instance.getViewport()
              })
            }}
            onMove={(_event, viewport) => applyBgTransform(viewport)}
            onMoveStart={() => setBgPaused(true)}
            onMoveEnd={() => setBgPaused(false)}
            onNodeDragStart={() => setBgPaused(true)}
            onNodeDragStop={() => setBgPaused(false)}
            onNodeClick={(_event, node) => {
              const cockpitNode = node.data.cockpitNode
              if (cockpitNode) openNodePanel(cockpitNode)
            }}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
            colorMode="dark"
          >
            <Controls showInteractive={false} className="helm-cockpit-controls" />
            <MiniMap
              className="helm-cockpit-minimap"
              pannable
              zoomable
              maskColor="rgba(0,0,0,0.65)"
              nodeColor={(n) => (n.data as FlowNodeData).accent}
            />
          </ReactFlow>
        )}
      </div>

      {historyOpen && <HistoryPanel onClose={() => setHistoryOpen(false)} />}

      {selectedNode && (
        <CockpitNodePanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onSelectNode={selectNodeById}
          allTools={allTools}
          onNodeUpdate={handleNodeUpdate}
        />
      )}
    </>
  )
}
