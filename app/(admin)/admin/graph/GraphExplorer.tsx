'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import * as THREE from 'three'
import { FilterPanel, type TypeCount } from './FilterPanel'
import { NodePanel } from './NodePanel'
import { colorForType, type GraphEdge, type GraphNode, type GraphPayload } from './types'

// react-force-graph-3d greift auf window/WebGL zu — muss client-only geladen werden.
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false })

const FOCUS_DEPTH = 2

interface SimEdge {
  source: string
  target: string
  type: string
  weight?: number
}

type SimNode = GraphNode & { x?: number; y?: number; z?: number }

/** Pro Knoten gecachte Three.js-Objekte — `onEngineTick` mutiert direkt Skalierung/Opacity
 * statt bei jedem Frame neue Meshes zu bauen (das würde die Simulation ausbremsen). */
interface NodeVisual {
  core: THREE.Mesh
  glow: THREE.Mesh
  material: THREE.MeshBasicMaterial
  glowMaterial: THREE.MeshBasicMaterial
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState({ width: 1500, height: 1000 })

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

  // react-force-graph-3d wird per next/dynamic geladen — die generischen Prop-Typen des
  // Moduls gehen dabei verloren, daher hier bewusst `any` statt gegen ForceGraphMethods<> zu kämpfen.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null)
  const [graphReady, setGraphReady] = useState(false)
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>()

  // ForceGraph3D wird per next/dynamic client-only nachgeladen — sein Ref ist erst gesetzt,
  // sobald der Code-Split-Chunk geladen UND gemountet ist. Ein Callback-Ref passt nicht zum
  // getypten MutableRefObject der Bibliothek, daher hier kurz pollen statt darauf zu warten.
  useEffect(() => {
    let raf: number
    const check = () => {
      if (graphRef.current) setGraphReady(true)
      else raf = requestAnimationFrame(check)
    }
    check()
    return () => cancelAnimationFrame(raf)
  }, [])

  // Von onEngineTick gelesene "Live"-Werte — als Refs statt State, damit der Tick-Handler nicht
  // bei jedem Hover/Klick neu erzeugt werden muss (er läuft potenziell 60x/Sekunde).
  const nodeVisualsRef = useRef<Map<string, NodeVisual>>(new Map())
  const hoveredIdRef = useRef<string | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  const connectedToHoverRef = useRef<Set<string> | null>(null)

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

  useEffect(() => {
    hoveredIdRef.current = hoveredId
  }, [hoveredId])

  useEffect(() => {
    selectedIdRef.current = selectedNode?.id ?? null
  }, [selectedNode])

  useEffect(() => {
    connectedToHoverRef.current = connectedToHover
  }, [connectedToHover])

  /** Physik lockerer als die Bibliotheks-Defaults: mehr Abstoßung, schwächere Zentrierung, kaum
   * Dämpfung — der Graph soll sich fortlaufend leicht bewegen statt nach dem Einpendeln einzufrieren. */
  useEffect(() => {
    if (!graphReady) return
    const fg = graphRef.current
    if (!fg) return
    const charge = fg.d3Force('charge')
    if (charge) charge.strength(-180).distanceMax(600)
    const link = fg.d3Force('link')
    if (link) link.distance(90)
    const center = fg.d3Force('center')
    if (center) center.strength(0.02)
  }, [graphReady, filteredNodes, filteredEdges])

  /** Sanfte Kamera-Rotation im Leerlauf — pausiert sofort bei Drag/Zoom, setzt nach kurzer
   * Pause wieder ein, damit der Graph nicht bei jeder Berührung stur weiterdreht. */
  useEffect(() => {
    if (!graphReady) return
    const fg = graphRef.current
    const controls = fg?.controls?.()
    if (!controls) return
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.6
    let idleTimer: ReturnType<typeof setTimeout> | null = null
    const pause = () => {
      controls.autoRotate = false
      if (idleTimer) clearTimeout(idleTimer)
    }
    const resume = () => {
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        controls.autoRotate = true
      }, 1500)
    }
    controls.addEventListener('start', pause)
    controls.addEventListener('end', resume)
    return () => {
      controls.removeEventListener('start', pause)
      controls.removeEventListener('end', resume)
      if (idleTimer) clearTimeout(idleTimer)
    }
  }, [graphReady])

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

  // THREE.Color parst kein `rgba(...)` mit Alpha-Kanal (anders als der 2D-Canvas-Context) —
  // die "gedimmt"-Fälle brauchen deshalb einen dunklen Vollton statt echter Transparenz;
  // die Basis-Deckkraft kommt über die globale `linkOpacity`-Prop.
  const linkColor = useCallback(
    (link: unknown) => {
      const l = link as SimEdge
      const sourceId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
      const targetId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
      if (connectedToHover && !(connectedToHover.has(sourceId) && connectedToHover.has(targetId))) {
        return '#202020'
      }
      return '#7f77dd'
    },
    [connectedToHover]
  )

  const particleColor = useCallback(
    (link: unknown) => {
      const l = link as SimEdge
      const sourceId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
      const targetId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
      if (connectedToHover && !(connectedToHover.has(sourceId) && connectedToHover.has(targetId))) return '#0a0a0a'
      return '#b0a8f0'
    },
    [connectedToHover]
  )

  /** Baut pro Knoten eine Kern-Kugel + eine additive Glow-Hülle. Die Größe ist bewusst deutlich
   * größer als im 2D-Rendering (dort 4-11px) — im 3D-Raum mit Kamera-Perspektive wirken kleine
   * Kugeln sonst wie Staubkörner. Farbe/Gruppierung bleiben unverändert über `colorForType`. */
  const nodeThreeObject = useCallback(
    (node: unknown) => {
      const n = node as SimNode
      const color = colorForType(n.type)
      const degree = degreeById.get(n.id) ?? 0
      const baseR = Math.min(9 + degree * 1.4, 26)

      const group = new THREE.Group()

      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
      const core = new THREE.Mesh(new THREE.SphereGeometry(baseR, 20, 20), material)
      group.add(core)

      const glowMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      })
      const glow = new THREE.Mesh(new THREE.SphereGeometry(baseR * 2.1, 16, 16), glowMaterial)
      group.add(glow)

      const highlight = new THREE.Mesh(
        new THREE.SphereGeometry(baseR * 0.32, 8, 8),
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false })
      )
      highlight.position.set(-baseR * 0.32, baseR * 0.32, baseR * 0.55)
      group.add(highlight)

      nodeVisualsRef.current.set(n.id, { core, glow, material, glowMaterial })
      return group
    },
    [degreeById]
  )

  /** Läuft bei jedem Simulationstick (dauerhaft, da cooldownTime=Infinity): pulsiert Glow/Kern
   * pro Knoten anhand einer stabilen Phase, dimmt nicht-verbundene Knoten beim Hover und hebt den
   * gehoverten/ausgewählten Knoten sichtbar hervor — als Refs statt State, um 60x/Sekunde
   * Re-Renders zu vermeiden. */
  const handleEngineTick = useCallback(() => {
    const now = Date.now()
    const connected = connectedToHoverRef.current
    for (const [id, visual] of nodeVisualsRef.current) {
      const isDimmed = connected != null && !connected.has(id)
      const isFocused = id === hoveredIdRef.current || id === selectedIdRef.current
      const pulse = 0.75 + 0.25 * Math.sin(now / 850 + phaseFromId(id))
      const boost = isFocused ? 1.4 : 1

      visual.core.scale.setScalar(boost * (0.95 + 0.08 * pulse))
      visual.material.opacity = isDimmed ? 0.15 : 1

      visual.glow.scale.setScalar(pulse * boost * 1.05)
      visual.glowMaterial.opacity = isDimmed ? 0 : 0.14 * pulse + (isFocused ? 0.14 : 0)
    }
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
    if (simNode) focusOnNode(simNode)
  }

  /** Fliegt die Kamera zu einem simulierten Knoten — Standard-"Fokus"-Rezept für
   * react-force-graph-3d: entlang der Blickrichtung Knoten↔Ursprung zurückweichen, statt die
   * Kamera exakt in den Knoten hinein zu setzen. */
  function focusOnNode(simNode: SimNode) {
    const fg = graphRef.current
    if (!fg || simNode.x == null || simNode.y == null) return
    const nx = simNode.x
    const ny = simNode.y
    const nz = simNode.z ?? 0
    const dist = Math.hypot(nx, ny, nz)
    const distRatio = dist > 0 ? 1 + 120 / dist : 1
    fg.cameraPosition({ x: nx * distRatio, y: ny * distRatio, z: nz * distRatio }, { x: nx, y: ny, z: nz }, 1000)
  }

  /** Springt von einer Referenz im NodePanel direkt zum verlinkten Knoten — schaltet dessen Typ
   * bei Bedarf sichtbar (analog zu "Nachbarschaft laden") und fliegt die Kamera dorthin. */
  function selectNodeById(id: string) {
    const match = nodesById.get(id)
    if (!match) return
    setSelectedNode(match)
    setVisibleTypes((prev) => (prev.has(match.type) ? prev : new Set(prev).add(match.type)))
    const simNodes: SimNode[] = graphRef.current?.graphData().nodes ?? []
    const simNode = simNodes.find((n) => n.id === id)
    if (simNode) focusOnNode(simNode)
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
        <ForceGraph3D
          ref={graphRef}
          graphData={graphData}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          showNavInfo={false}
          nodeId="id"
          nodeLabel="label"
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={false}
          linkColor={linkColor}
          linkOpacity={0.6}
          linkWidth={0.6}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.004}
          linkDirectionalParticleColor={particleColor}
          cooldownTime={Infinity}
          d3AlphaDecay={0.006}
          d3VelocityDecay={0.25}
          onEngineTick={handleEngineTick}
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
