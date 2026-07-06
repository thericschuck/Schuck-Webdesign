'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { FilterPanel, type TypeCount } from './FilterPanel'
import { NodePanel } from './NodePanel'
import { colorForType, type GraphEdge, type GraphNode, type GraphPayload } from './types'

// react-force-graph-2d greift auf window/canvas zu — muss client-only geladen werden.
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

const FOCUS_DEPTH = 2

interface SimEdge {
  source: string
  target: string
  type: string
  weight?: number
}

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

  const graphData = useMemo(
    () => ({
      nodes: filteredNodes.map((n) => ({ ...n })),
      links: filteredEdges.map((e) => ({ ...e } as SimEdge)),
    }),
    [filteredNodes, filteredEdges]
  )

  const nodeColor = useCallback(
    (node: unknown) => {
      const n = node as GraphNode
      if (connectedToHover && !connectedToHover.has(n.id)) return '#e5e7eb'
      return colorForType(n.type)
    },
    [connectedToHover]
  )

  const linkColor = useCallback(
    (link: unknown) => {
      const l = link as SimEdge
      const sourceId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
      const targetId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
      if (connectedToHover && !(connectedToHover.has(sourceId) && connectedToHover.has(targetId))) {
        return 'rgba(203,213,225,0.4)'
      }
      return 'rgba(148,163,184,0.6)'
    },
    [connectedToHover]
  )

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
    const simNodes: (GraphNode & { x?: number; y?: number })[] = graphRef.current?.graphData().nodes ?? []
    const simNode = simNodes.find((n) => n.id === match.id)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[75vh] bg-white rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Graph wird geladen…
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[75vh] bg-white rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-sm text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {error}
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-[75vh]">
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

      <div ref={containerRef} className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={size.width}
          height={size.height}
          nodeId="id"
          nodeLabel="label"
          nodeColor={nodeColor}
          nodeRelSize={4.5}
          linkColor={linkColor}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          onNodeClick={(node: unknown) => setSelectedNode(node as GraphNode)}
          onNodeHover={(node: unknown) => setHoveredId((node as GraphNode | null)?.id ?? null)}
        />
      </div>

      {selectedNode && (
        <NodePanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          showLoadNeighborhood={truncated && !loadedNeighborhoods.has(selectedNode.id)}
          loadingNeighborhood={loadingNeighborhood}
          onLoadNeighborhood={handleLoadNeighborhood}
        />
      )}
    </div>
  )
}
