'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { FilterPanel, type TypeCount } from './FilterPanel'
import { NodePanel } from './NodePanel'
import { colorForType, hexToRgba, type GraphEdge, type GraphNode, type GraphPayload } from './types'

// react-force-graph-2d greift auf window/canvas zu — muss client-only geladen werden.
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

const FOCUS_DEPTH = 2

interface SimEdge {
  source: string
  target: string
  type: string
  weight?: number
}

type SimNode = GraphNode & { x?: number; y?: number }

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })

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

/** BFS über die Kanten bis FOCUS_DEPTH — liefert die Knoten-IDs der Nachbarschaft inkl. Startknoten. */
function neighborhoodIds(startId: string, edges: GraphEdge[], depth: number): Set<string> {
  const adjacency = new Map<string, Set<string>>()
  for (const e of edges) {
    if (!adjacency.has(e.source)) adjacency.set(e.source, new Set())
    if (!adjacency.has(e.target)) adjacency.set(e.target, new Set())
    adjacency.get(e.source)!.add(e.target)
    adjacency.get(e.target)!.add(e.source)
  }

  const visited = new Set<string>([startId])
  let frontier = [startId]
  for (let i = 0; i < depth; i++) {
    const next: string[] = []
    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          next.push(neighbor)
        }
      }
    }
    frontier = next
    if (frontier.length === 0) break
  }
  return visited
}

/** Stabiler Zahlen-Hash aus der Node-ID — gibt jedem Knoten eine eigene, aber deterministische Puls-Phase. */
function phaseFromId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 1000
  return hash
}

export function GraphExplorer() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [truncated, setTruncated] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set())
  const [focusClientId, setFocusClientId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [loadingNeighborhood, setLoadingNeighborhood] = useState(false)
  const [loadedNeighborhoods, setLoadedNeighborhoods] = useState<Set<string>>(new Set())

  // react-force-graph-2d wird per next/dynamic geladen — die generischen Prop-Typen des
  // Moduls gehen dabei verloren, daher hier bewusst `any` statt gegen ForceGraphMethods<> zu kämpfen.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null)
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>()

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/graph')
      .then((res) => {
        if (!res.ok) throw new Error(`Graph konnte nicht geladen werden (${res.status}).`)
        return res.json() as Promise<GraphPayload>
      })
      .then((payload) => {
        if (cancelled) return
        setNodes(payload.nodes)
        setEdges(payload.edges)
        setTruncated(payload.truncated)
        setTotalCount(payload.totalCount ?? payload.nodes.length)
        setVisibleTypes(new Set(payload.nodes.map((n) => n.type)))
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

  const typeCounts: TypeCount[] = useMemo(() => {
    const counts = new Map<string, number>()
    for (const n of nodes) counts.set(n.type, (counts.get(n.type) ?? 0) + 1)
    return [...counts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
  }, [nodes])

  const nodesById = useMemo(() => {
    const map = new Map<string, GraphNode>()
    for (const n of nodes) map.set(n.id, n)
    return map
  }, [nodes])

  /** Alle Knoten, auf die eine Kante des ausgewählten Knotens zeigt (oder umgekehrt) — für die
   * "Verbindungen"-Liste im NodePanel. Läuft bewusst über die ungefilterten `edges`/`nodes`, damit
   * Referenzen auch dann sichtbar sind, wenn ihr Typ gerade über die Legende ausgeblendet ist. */
  const selectedConnections = useMemo(() => {
    if (!selectedNode) return []
    const seen = new Set<string>()
    const result: { id: string; label: string; type: string }[] = []
    for (const e of edges) {
      let otherId: string | null = null
      if (e.source === selectedNode.id) otherId = e.target
      else if (e.target === selectedNode.id) otherId = e.source
      if (!otherId || seen.has(otherId)) continue
      const other = nodesById.get(otherId)
      if (!other) continue
      seen.add(otherId)
      result.push({ id: other.id, label: other.label, type: other.type })
    }
    return result.sort((a, b) => a.label.localeCompare(b.label))
  }, [selectedNode, edges, nodesById])

  const clientOptions = useMemo(
    () =>
      nodes
        .filter((n) => n.type === 'client')
        .map((n) => ({ id: n.id.slice('client:'.length), label: n.label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [nodes]
  )

  const { filteredNodes, filteredEdges } = useMemo(() => {
    let allowedIds: Set<string> | null = null
    if (focusClientId) {
      allowedIds = neighborhoodIds(`client:${focusClientId}`, edges, FOCUS_DEPTH)
    }

    const fNodes = nodes.filter((n) => visibleTypes.has(n.type) && (!allowedIds || allowedIds.has(n.id)))
    const nodeIdSet = new Set(fNodes.map((n) => n.id))
    const fEdges = edges.filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
    return { filteredNodes: fNodes, filteredEdges: fEdges }
  }, [nodes, edges, visibleTypes, focusClientId])

  const connectedToHover = useMemo(() => {
    if (!hoveredId) return null
    const ids = new Set<string>([hoveredId])
    for (const e of filteredEdges) {
      if (e.source === hoveredId) ids.add(e.target)
      if (e.target === hoveredId) ids.add(e.source)
    }
    return ids
  }, [hoveredId, filteredEdges])

  /** Grad (Anzahl Kanten) je Knoten — größere/wichtigere Knoten (Hubs) wirken dadurch "näher". */
  const degreeById = useMemo(() => {
    const degrees = new Map<string, number>()
    for (const e of filteredEdges) {
      degrees.set(e.source, (degrees.get(e.source) ?? 0) + 1)
      degrees.set(e.target, (degrees.get(e.target) ?? 0) + 1)
    }
    return degrees
  }, [filteredEdges])

  const graphData = useMemo(
    () => ({
      nodes: filteredNodes.map((n) => ({ ...n })),
      links: filteredEdges.map((e) => ({ ...e }) as SimEdge),
    }),
    [filteredNodes, filteredEdges]
  )

  const linkColor = useCallback(
    (link: unknown) => {
      const l = link as SimEdge
      const sourceId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
      const targetId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
      if (connectedToHover && !(connectedToHover.has(sourceId) && connectedToHover.has(targetId))) {
        return 'rgba(255,255,255,0.04)'
      }
      return 'rgba(127,119,221,0.35)'
    },
    [connectedToHover]
  )

  const particleColor = useCallback(
    (link: unknown) => {
      const l = link as SimEdge
      const sourceId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
      const targetId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
      if (connectedToHover && !(connectedToHover.has(sourceId) && connectedToHover.has(targetId))) return 'rgba(0,0,0,0)'
      return '#b0a8f0'
    },
    [connectedToHover]
  )

  /** Eigenes Rendering statt nodeColor/nodeCanvasObject-Default: pulsierender Glow + heller Kern,
   * damit die Knoten wirken, als würden sie leuchten/kommunizieren — nicht nur als statische Punkte. */
  const nodeCanvasObject = useCallback(
    (node: unknown, ctx: CanvasRenderingContext2D) => {
      const n = node as SimNode
      if (n.x == null || n.y == null) return

      const isDimmed = connectedToHover != null && !connectedToHover.has(n.id)
      const color = colorForType(n.type)
      const degree = degreeById.get(n.id) ?? 0
      const baseR = Math.min(4 + degree * 0.6, 11)

      if (!isDimmed) {
        const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 850 + phaseFromId(n.id))
        const glowR = baseR * 3.2 * pulse
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR)
        grd.addColorStop(0, hexToRgba(color, 0.45 * pulse))
        grd.addColorStop(0.5, hexToRgba(color, 0.12 * pulse))
        grd.addColorStop(1, hexToRgba(color, 0))
        ctx.fillStyle = grd
        ctx.beginPath()
        ctx.arc(n.x, n.y, glowR, 0, 2 * Math.PI)
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(n.x, n.y, baseR, 0, 2 * Math.PI)
      ctx.fillStyle = isDimmed ? 'rgba(255,255,255,0.12)' : color
      ctx.fill()

      if (!isDimmed) {
        ctx.beginPath()
        ctx.arc(n.x - baseR * 0.28, n.y - baseR * 0.28, baseR * 0.35, 0, 2 * Math.PI)
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.fill()
      }
    },
    [connectedToHover, degreeById]
  )

  const nodePointerAreaPaint = useCallback((node: unknown, color: string, ctx: CanvasRenderingContext2D) => {
    const n = node as SimNode
    if (n.x == null || n.y == null) return
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(n.x, n.y, 8, 0, 2 * Math.PI)
    ctx.fill()
  }, [])

  function toggleType(type: string) {
    setVisibleTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  function handleSearchSubmit() {
    const query = search.trim().toLowerCase()
    if (!query) return
    const match = filteredNodes.find((n) => n.label.toLowerCase().includes(query))
    if (!match) return
    setSelectedNode(match)
    const simNodes: SimNode[] = graphRef.current?.graphData().nodes ?? []
    const simNode = simNodes.find((n) => n.id === match.id)
    if (simNode && simNode.x != null && simNode.y != null) {
      graphRef.current?.centerAt(simNode.x, simNode.y, 800)
      graphRef.current?.zoom(4, 800)
    }
  }

  /** Springt von einer Referenz im NodePanel direkt zum verlinkten Knoten — schaltet dessen Typ
   * bei Bedarf sichtbar (analog zu "Nachbarschaft laden") und zentriert die Simulation darauf. */
  function selectNodeById(id: string) {
    const match = nodesById.get(id)
    if (!match) return
    setSelectedNode(match)
    setVisibleTypes((prev) => (prev.has(match.type) ? prev : new Set(prev).add(match.type)))
    const simNodes: SimNode[] = graphRef.current?.graphData().nodes ?? []
    const simNode = simNodes.find((n) => n.id === id)
    if (simNode && simNode.x != null && simNode.y != null) {
      graphRef.current?.centerAt(simNode.x, simNode.y, 800)
      graphRef.current?.zoom(4, 800)
    }
  }

  async function handleLoadNeighborhood() {
    if (!selectedNode) return
    setLoadingNeighborhood(true)
    try {
      const res = await fetch(`/api/admin/graph?expand=${encodeURIComponent(selectedNode.id)}`)
      if (!res.ok) throw new Error('Nachbarschaft konnte nicht geladen werden.')
      const result: { nodes: GraphNode[]; edges: GraphEdge[] } = await res.json()

      setNodes((prev) => {
        const existingIds = new Set(prev.map((n) => n.id))
        const additions = result.nodes.filter((n) => !existingIds.has(n.id))
        return [...prev, ...additions]
      })
      setEdges((prev) => {
        const existingKeys = new Set(prev.map((e) => `${e.source}|${e.target}|${e.type}`))
        const additions = result.edges.filter((e) => !existingKeys.has(`${e.source}|${e.target}|${e.type}`))
        return [...prev, ...additions]
      })
      setVisibleTypes((prev) => {
        const next = new Set(prev)
        for (const n of result.nodes) next.add(n.type)
        return next
      })
      setLoadedNeighborhoods((prev) => new Set(prev).add(selectedNode.id))
    } catch (err) {
      console.error('[graph] Nachbarschaft konnte nicht geladen werden:', err)
    } finally {
      setLoadingNeighborhood(false)
    }
  }

  // Füllt den Content-Bereich randlos, lässt die Admin-Sidebar (links, z-40) und die mobile
  // Topbar (oben, z-50) aber sichtbar/erreichbar — kein eigener "Zurück"-Button nötig.
  const shellClass = 'fixed inset-x-0 bottom-0 top-14 md:top-0 md:left-60 overflow-hidden bg-[#080808]'

  if (loading) {
    return (
      <div className={`${shellClass} flex items-center justify-center`}>
        <p className="text-sm text-white/40" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Graph wird geladen…
        </p>
      </div>
    )
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
    <div className={shellClass}>
      {/* Ambient-Glow-Hintergrund, angelehnt an die Hero-Section der Landingpage (#080808 + #7F77DD-Radialverlauf) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(127,119,221,0.08) 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)' }}
      />

      <div ref={containerRef} className="absolute inset-0">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          nodeId="id"
          nodeLabel="label"
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={nodePointerAreaPaint}
          linkColor={linkColor}
          linkWidth={1}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.004}
          linkDirectionalParticleColor={particleColor}
          cooldownTime={Infinity}
          d3AlphaDecay={0.004}
          d3VelocityDecay={0.35}
          onNodeClick={(node: unknown) => setSelectedNode(node as GraphNode)}
          onNodeHover={(node: unknown) => setHoveredId((node as GraphNode | null)?.id ?? null)}
        />
      </div>

      <div className="absolute top-5 left-5 bottom-5 z-20 pointer-events-none">
        <div className="pointer-events-auto h-full">
          <FilterPanel
            typeCounts={typeCounts}
            visibleTypes={visibleTypes}
            onToggleType={toggleType}
            search={search}
            onSearchChange={setSearch}
            onSearchSubmit={handleSearchSubmit}
            clientOptions={clientOptions}
            focusClientId={focusClientId}
            onFocusChange={setFocusClientId}
            totalCount={totalCount}
            truncated={truncated}
          />
        </div>
      </div>

      {selectedNode && (
        <NodePanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          connections={selectedConnections}
          onSelectConnection={selectNodeById}
          showLoadNeighborhood={truncated && !loadedNeighborhoods.has(selectedNode.id)}
          loadingNeighborhood={loadingNeighborhood}
          onLoadNeighborhood={handleLoadNeighborhood}
        />
      )}
    </div>
  )
}
