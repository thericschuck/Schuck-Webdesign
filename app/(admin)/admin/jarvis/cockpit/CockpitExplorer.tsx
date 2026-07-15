'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { CockpitNodePanel } from './CockpitNodePanel'
import { colorForNode, hexToRgba, KIND_LABEL, type CockpitEdge, type CockpitNode, type CockpitPayload, type Significance } from './types'
import { useAgentRunsRealtime, type AgentRunChangeRow } from './useAgentRunsRealtime'

// Greift auf window/Canvas zu — muss client-only geladen werden (wie bei der
// Knowledge-Graph-Seite, app/(admin)/admin/graph/GraphExplorer.tsx).
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

interface SimNode extends CockpitNode {
  x?: number
  y?: number
}

interface ActiveRunVisual {
  significance: Significance
  phase: 'active' | 'fading'
  /** Zeitpunkt, seit dem die aktuelle Phase läuft — bei 'fading' der Moment des
   * Status-Wechsels weg von 'running', nicht der Run-Start. */
  since: number
}

/** Wie auffällig/lang ein Knoten nach Abschluss seines Runs noch nachleuchtet — Vorgabe
 * aus JARVIS_COCKPIT_KONZEPT.md: "ein trivial-Run pulsiert kurz und dezent, ein
 * notable-Run deutlich sichtbarer". Ein hartes Entfernen exakt bei Status-Wechsel würde
 * bei sehr kurzen Runs (oft <1s, siehe agent_steps duration_ms) als Flackern wirken statt
 * als wahrnehmbares Signal — daher ein kurzes Fade-out statt eines Sprungs auf 0.
 */
const PULSE_CONFIG: Record<Significance, { ringScale: number; ringWidth: number; glowAlpha: number; periodMs: number; fadeMs: number }> = {
  trivial: { ringScale: 1.3, ringWidth: 1.5, glowAlpha: 0.22, periodMs: 950, fadeMs: 500 },
  normal: { ringScale: 1.55, ringWidth: 2, glowAlpha: 0.34, periodMs: 800, fadeMs: 1300 },
  notable: { ringScale: 1.95, ringWidth: 3, glowAlpha: 0.55, periodMs: 650, fadeMs: 3000 },
}

/** Wie lang die Delegations-Partikel auf der orchestrator->agent-Kante laufen, nachdem ein
 * neuer Sub-Agent-Run angelegt wurde. */
const DELEGATION_FLASH_MS = 2500

/** Stabiler Zahlen-Hash aus der Node-ID — gleiche Technik wie in GraphExplorer.tsx,
 * bewusst hier lokal statt importiert (dort ebenfalls nur lokal genutzt, kein
 * gemeinsames Utility-Modul für diese eine kleine Funktion). */
function phaseFromId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 1000
  return hash
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState({ width: 900, height: 560 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, size }
}

function radiusForNode(node: CockpitNode): number {
  if (node.kind === 'orchestrator') return 22
  if (node.kind === 'agent') return 14
  return 8
}

const LEGEND: { kind: CockpitNode['kind']; label: string }[] = [
  { kind: 'orchestrator', label: KIND_LABEL.orchestrator },
  { kind: 'agent', label: KIND_LABEL.agent },
  { kind: 'tool', label: KIND_LABEL.tool },
]

export function CockpitExplorer() {
  const [nodes, setNodes] = useState<CockpitNode[]>([])
  const [edges, setEdges] = useState<CockpitEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<CockpitNode | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null)
  const [graphReady, setGraphReady] = useState(false)
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>()
  const simNodeRegistryRef = useRef<Map<string, SimNode>>(new Map())

  // Live-Zustand aus der Realtime-Subscription — bewusst als Ref statt State: die
  // nodeCanvasObject/linkDirectionalParticles-Callbacks laufen über den laufenden
  // Force-Graph-Tick (cooldownTime=Infinity, s.u.) potenziell 60x/Sekunde und lesen diese
  // Werte bei jedem Frame frisch — ein State-Update pro Realtime-Event würde dafür unnötig
  // oft re-rendern (gleiches Muster wie nodeVisualsRef in GraphExplorer.tsx).
  const activeRunsRef = useRef<Map<string, ActiveRunVisual>>(new Map())
  const flashEdgesRef = useRef<Map<string, number>>(new Map())

  const nodesByIdForRealtimeRef = useRef<Map<string, CockpitNode>>(new Map())
  const edgesForRealtimeRef = useRef<CockpitEdge[]>([])

  const handleAgentRunChange = useCallback((row: AgentRunChangeRow, eventType: 'INSERT' | 'UPDATE') => {
    if (!row.agent_id) return
    const nodeId = `agent:${row.agent_id}`
    // Run für einen Agenten, der (noch) nicht Teil des geladenen Graphen ist — z.B. eine
    // Race Condition kurz nach dem initialen Fetch. Kein Grund zum Absturz, einfach ignorieren.
    if (!nodesByIdForRealtimeRef.current.has(nodeId)) return

    if (row.status === 'running' || row.status === 'queued') {
      activeRunsRef.current.set(nodeId, { significance: row.significance, phase: 'active', since: Date.now() })
    } else {
      const existing = activeRunsRef.current.get(nodeId)
      if (existing) activeRunsRef.current.set(nodeId, { ...existing, phase: 'fading', since: Date.now() })
    }

    // Partikel-Fluss orchestrator->agent nur beim eigentlichen Delegations-Moment (neuer
    // Run), nicht bei jedem Folge-Update desselben Runs.
    if (eventType === 'INSERT' && row.trigger === 'sub_agent') {
      for (const e of edgesForRealtimeRef.current) {
        if (e.type === 'delegates_to' && e.target === nodeId) {
          flashEdgesRef.current.set(`${e.source}|${e.target}`, Date.now() + DELEGATION_FLASH_MS)
        }
      }
    }
  }, [])

  const { connectionStatus } = useAgentRunsRealtime(handleAgentRunChange)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/jarvis/cockpit')
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

  useEffect(() => {
    setGraphReady(false)
    graphRef.current = null
    let raf: number
    const check = () => {
      if (graphRef.current) setGraphReady(true)
      else raf = requestAnimationFrame(check)
    }
    check()
    return () => cancelAnimationFrame(raf)
  }, [])

  const nodesById = useMemo(() => {
    const map = new Map<string, CockpitNode>()
    for (const n of nodes) map.set(n.id, n)
    return map
  }, [nodes])

  // Für die Tool-Zuordnungs-Checkliste im Bearbeiten-Formular des Node-Panels — die
  // vollständige Tool-Liste ist ohnehin schon Teil des geladenen Graphen, kein eigener Fetch nötig.
  const allTools = useMemo(() => nodes.filter((n) => n.kind === 'tool'), [nodes])

  /** Nach einer Bearbeitung im Node-Panel: aktualisiert sowohl den Graph-State (damit ein
   * Re-Öffnen des Panels den neuen Stand zeigt) als auch das aktuell offene Panel selbst —
   * kein voller Re-Fetch von /api/admin/jarvis/cockpit, der die Force-Graph-Simulation neu
   * starten und alle Knoten-Positionen zurücksetzen würde. */
  function handleNodeUpdate(updated: CockpitNode) {
    setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
    setSelectedNode(updated)
  }

  // Realtime-Handler liest diese Refs (siehe handleAgentRunChange oben) statt direkt
  // nodesById/edges aus dem Closure — die Callback-Referenz von useAgentRunsRealtime bleibt
  // dadurch stabil (useCallback ohne nodesById/edges als Dependency), während der Inhalt
  // trotzdem nach jedem Fetch aktuell ist.
  useEffect(() => {
    nodesByIdForRealtimeRef.current = nodesById
  }, [nodesById])
  useEffect(() => {
    edgesForRealtimeRef.current = edges
  }, [edges])

  const connectedToHover = useMemo(() => {
    if (!hoveredId) return null
    const ids = new Set<string>([hoveredId])
    for (const e of edges) {
      if (e.source === hoveredId) ids.add(e.target)
      if (e.target === hoveredId) ids.add(e.source)
    }
    return ids
  }, [hoveredId, edges])

  // 2D-Physik-Tuning wie in GraphExplorer.tsx — etwas größere Link-Distanz, damit die
  // Tool-Blätter um jeden Sub-Agenten sichtbar Platz zum Fächern haben.
  useEffect(() => {
    if (!graphReady) return
    const fg = graphRef.current
    if (!fg) return
    const charge = fg.d3Force('charge')
    if (charge) charge.strength(-180).distanceMax(500)
    const link = fg.d3Force('link')
    if (link) link.distance(90)
  }, [graphReady])

  const graphData = useMemo(
    () => ({
      nodes: nodes.map((n) => ({ ...n })),
      links: edges.map((e) => ({ ...e })),
    }),
    [nodes, edges]
  )

  const linkColor = useCallback(
    (link: unknown) => {
      const l = link as CockpitEdge
      const sourceId = typeof l.source === 'string' ? l.source : (l.source as CockpitNode).id
      const targetId = typeof l.target === 'string' ? l.target : (l.target as CockpitNode).id
      const isDimmed = connectedToHover != null && !(connectedToHover.has(sourceId) && connectedToHover.has(targetId))
      return isDimmed ? 'rgba(255,255,255,0.05)' : 'rgba(155,144,245,0.55)'
    },
    [connectedToHover]
  )

  const nodeCanvasObject = useCallback(
    (node: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as SimNode
      simNodeRegistryRef.current.set(n.id, n)
      if (n.x == null || n.y == null) return

      const isDimmed = connectedToHover != null && !connectedToHover.has(n.id)
      const color = colorForNode(n)
      const r = radiusForNode(n)

      if (!isDimmed) {
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.6)
        grd.addColorStop(0, hexToRgba(color, 0.35))
        grd.addColorStop(1, hexToRgba(color, 0))
        ctx.fillStyle = grd
        ctx.beginPath()
        ctx.arc(n.x, n.y, r * 2.6, 0, 2 * Math.PI)
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(n.x, n.y, r, 0, 2 * Math.PI)
      ctx.fillStyle = isDimmed ? 'rgba(255,255,255,0.12)' : color
      ctx.fill()

      if (n.kind === 'agent' && n.agentStatus === 'inactive') {
        ctx.lineWidth = 1.5
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'
        ctx.stroke()
      }

      // Live-Aktivität: pulsierender Ring, solange ein Run für diesen Knoten läuft, danach
      // kurzes Fade-out statt eines abrupten Verschwindens (siehe PULSE_CONFIG-Kommentar).
      // Läuft unabhängig von isDimmed — ein aktiver Run ist ein wichtigeres Signal als der
      // Hover-Dimm-Zustand unbeteiligter Knoten.
      const pulse = activeRunsRef.current.get(n.id)
      if (pulse) {
        const cfg = PULSE_CONFIG[pulse.significance]
        let intensity = 1
        if (pulse.phase === 'fading') {
          intensity = Math.max(0, 1 - (Date.now() - pulse.since) / cfg.fadeMs)
          if (intensity <= 0) activeRunsRef.current.delete(n.id)
        }
        if (intensity > 0) {
          const osc = 0.6 + 0.4 * Math.sin((Date.now() / cfg.periodMs) * Math.PI * 2 + phaseFromId(n.id))
          const ringR = r * (1.15 + (cfg.ringScale - 1) * osc)

          const glow = ctx.createRadialGradient(n.x, n.y, r, n.x, n.y, ringR * 1.6)
          glow.addColorStop(0, hexToRgba(color, cfg.glowAlpha * intensity * 0.5))
          glow.addColorStop(1, hexToRgba(color, 0))
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(n.x, n.y, ringR * 1.6, 0, 2 * Math.PI)
          ctx.fill()

          ctx.beginPath()
          ctx.arc(n.x, n.y, ringR, 0, 2 * Math.PI)
          ctx.strokeStyle = hexToRgba(color, intensity * (cfg.glowAlpha + osc * 0.3))
          ctx.lineWidth = cfg.ringWidth
          ctx.stroke()
        }
      }

      // Labels bleiben bei jedem Zoom-Level lesbar (feste Bildschirmgröße statt mit dem
      // Graphen mitzuskalieren) — bei nur ~30 Knoten sind Labels hier essenziell für die
      // Lesbarkeit, anders als bei der Business-Graph-Seite mit hunderten Knoten.
      const fontSize = Math.max(10 / globalScale, 3)
      ctx.font = `${fontSize}px var(--font-dm-sans, sans-serif)`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = isDimmed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.85)'
      ctx.fillText(n.label, n.x, n.y + r + 3)
    },
    [connectedToHover]
  )

  const nodePointerAreaPaint = useCallback((node: unknown, color: string, ctx: CanvasRenderingContext2D) => {
    const n = node as SimNode
    if (n.x == null || n.y == null) return
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(n.x, n.y, radiusForNode(n) + 3, 0, 2 * Math.PI)
    ctx.fill()
  }, [])

  function edgeKey(link: unknown): string {
    const l = link as CockpitEdge
    const sourceId = typeof l.source === 'string' ? l.source : (l.source as CockpitNode).id
    const targetId = typeof l.target === 'string' ? l.target : (l.target as CockpitNode).id
    return `${sourceId}|${targetId}`
  }

  // Kurzer Partikel-Fluss entlang orchestrator->agent, wenn gerade eine Delegation
  // passiert ist (siehe handleAgentRunChange) — normalerweise 0 Partikel, d.h. unsichtbar.
  const linkDirectionalParticles = useCallback((link: unknown) => {
    const key = edgeKey(link)
    const expiry = flashEdgesRef.current.get(key)
    if (expiry == null) return 0
    if (Date.now() > expiry) {
      flashEdgesRef.current.delete(key)
      return 0
    }
    return 4
  }, [])

  const linkDirectionalParticleColor = useCallback(
    (link: unknown) => {
      const l = link as CockpitEdge
      const targetId = typeof l.target === 'string' ? l.target : (l.target as CockpitNode).id
      const targetNode = nodesById.get(targetId)
      return targetNode ? colorForNode(targetNode) : '#7F77DD'
    },
    [nodesById]
  )

  function selectNodeById(id: string) {
    const match = nodesById.get(id)
    if (!match) return
    setSelectedNode(match)
    const fg = graphRef.current
    const simNode = simNodeRegistryRef.current.get(id)
    if (fg && simNode?.x != null && simNode?.y != null) {
      fg.centerAt(simNode.x, simNode.y, 600)
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-140 rounded-2xl bg-[#0c0c0c] border border-white/8">
        <p className="text-sm text-red-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {error}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="relative h-140 rounded-2xl overflow-hidden bg-[#0c0c0c] border border-white/8 shadow-xl shadow-black/30">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(127,119,221,0.10) 0%, transparent 70%)' }}
        />

        <div className="absolute top-4 left-4 z-10 flex items-center gap-4 px-3 py-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/8">
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

        {/* Dezenter Hinweis statt einer harten Fehlermeldung — der Supabase-Client verbindet
            Realtime-Channels bei einem Abbruch normalerweise selbst neu, dieser Banner ist
            nur die sichtbare Rückmeldung dafür, solange die Verbindung wirklich fehlt. */}
        {connectionStatus === 'lost' && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/25">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-300" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Verbindung verloren — verbinde erneut…
            </span>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-white/40" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Cockpit wird geladen…
            </p>
          </div>
        )}

        <div ref={containerRef} className="absolute inset-0">
          {!loading && (
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              width={size.width}
              height={size.height}
              backgroundColor="rgba(0,0,0,0)"
              nodeId="id"
              nodeLabel={(node: unknown) => {
                const n = node as CockpitNode
                return `${KIND_LABEL[n.kind]}: ${n.label}`
              }}
              nodeCanvasObject={nodeCanvasObject}
              nodePointerAreaPaint={nodePointerAreaPaint}
              linkColor={linkColor}
              linkWidth={1.4}
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              linkDirectionalParticles={linkDirectionalParticles}
              linkDirectionalParticleWidth={3.5}
              linkDirectionalParticleSpeed={0.02}
              linkDirectionalParticleColor={linkDirectionalParticleColor}
              cooldownTime={Infinity}
              d3AlphaDecay={0.006}
              d3VelocityDecay={0.35}
              onNodeClick={(node: unknown) => setSelectedNode(node as CockpitNode)}
              onNodeHover={(node: unknown) => setHoveredId((node as CockpitNode | null)?.id ?? null)}
            />
          )}
        </div>
      </div>

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
