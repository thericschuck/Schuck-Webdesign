'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import * as THREE from 'three'
import { FilterPanel, type RenderMode, type TypeCount } from './FilterPanel'
import { NodePanel } from './NodePanel'
import { colorForType, hexToRgba, type GraphEdge, type GraphNode, type GraphPayload } from './types'

// Beide greifen auf window/Canvas bzw. WebGL zu — müssen client-only geladen werden.
// Nur die gerade aktive Variante wird tatsächlich als Chunk nachgeladen (siehe renderMode unten).
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false })

const FOCUS_DEPTH = 2
// Wie nah die Kamera beim Fokussieren (Suche / Klick auf eine Verbindung) im 3D-Modus an den
// Zielknoten heranfliegt (Weltein­heiten). Größerer Wert = mehr Abstand/Übersicht.
const FOCUS_DISTANCE_3D = 280
// Zoom-Level beim Fokussieren im 2D-Modus. Kleinerer Wert = mehr Abstand/Übersicht.
const FOCUS_ZOOM_2D = 4

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

/** Mischt zwei Hex-Farben (z.B. Start-/Zielknoten einer Kante) zu einer Durchschnittsfarbe.
 * Kein echter Verlauf — three-forcegraphs `linkColor` akzeptiert dafür nur einen einzelnen,
 * per `new THREE.Color()` parsbaren Wert; ein Array wird nicht unterstützt (und fällt sonst
 * unbemerkt auf Schwarz zurück). Ein echter Gradient bräuchte ein komplett eigenes
 * `linkThreeObject` mit Vertex-Colors statt der `linkColor`-Prop. */
function mixHexColors(a: string, b: string): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const r = Math.round(((pa >> 16 & 255) + (pb >> 16 & 255)) / 2)
  const g = Math.round(((pa >> 8 & 255) + (pb >> 8 & 255)) / 2)
  const bl = Math.round(((pa & 255) + (pb & 255)) / 2)
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Größen-Hierarchie nach Entitäts-Typ statt nach Grad: Kunden am größten, Projekte etwas
 * kleiner, alles andere nochmal kleiner. */
function radiusForType(type: string, table: { client: number; project: number; other: number }): number {
  if (type === 'client') return table.client
  if (type === 'project') return table.project
  return table.other
}
const NODE_RADIUS_3D = { client: 24, project: 16, other: 9 }
const NODE_RADIUS_2D = { client: 16, project: 11, other: 7 }

type ForceNode = SimNode & { vx?: number; vy?: number; vz?: number }

/** Custom d3-Force (nur 3D): verbundene Knoten bekommen einen sanften Zug zur Mitte, unverbundene
 * ("einzelne") Knoten werden auf einen Torus (Donut-Röhre) um die Mitte gezogen — wie Trabanten
 * um einen Stern, aber bewusst KEINE gleichmäßige Kugelschale (dafür sorgt der auf einen
 * Ring-Querschnitt begrenzte Radius/Z-Versatz). Winkel/Querschnitt kommen aus dem Node-ID-Hash,
 * damit die Verteilung stabil bleibt statt bei jedem Tick neu zu "springen".
 */
function createRadialSpreadForce(degreeById: Map<string, number>) {
  let simNodes: ForceNode[] = []
  let ringIndexById = new Map<string, number>()
  let ringCount = 0
  const ringRadius = 980
  // Röhren-Radius des Querschnitts: Knoten sitzen in einem gefüllten Kreisquerschnitt um den
  // Ring (Torus/Donut-Form) statt in einer flachen Scheibe — macht den Ring spürbar breiter/
  // voluminöser statt wie eine dünne, flache Platte zu wirken.
  const tubeRadius = 300
  // Ring-Ebene ist um die X-Achse geneigt statt flach in XY — wirkt im 3D-Raum wie eine
  // gekippte Scheibe statt wie ein flacher Kreis mit Z-Rauschen.
  const tiltRad = (18 * Math.PI) / 180
  // Volle Umdrehung der Ring-Ebene alle 100s — unabhängig von der Kamera-Autorotation.
  const rotationPeriodMs = 100000

  function force(alpha: number) {
    const spin = (Date.now() / rotationPeriodMs) * Math.PI * 2
    // Nur für verbundene Knoten weiterhin über Federkraft lösen (skaliert mit alpha, wie gehabt).
    const centerK = alpha * 0.12
    const slice = (Math.PI * 2) / Math.max(ringCount, 1)

    for (const n of simNodes) {
      if (n.x == null || n.y == null) continue
      const degree = degreeById.get(n.id) ?? 0

      if (degree > 0) {
        // Verbundene Knoten: zusätzlicher sanfter Zug Richtung Ursprung, oben auf Link-/Center-Kraft.
        n.vx = (n.vx ?? 0) - n.x * centerK * 0.5
        n.vy = (n.vy ?? 0) - n.y * centerK * 0.5
        if (n.z != null) n.vz = (n.vz ?? 0) - n.z * centerK * 0.5
        continue
      }

      // Unverbundene Knoten: Position direkt setzen statt über eine Feder-Kraft anzuziehen.
      // Das vermeidet zwei Probleme mit dem alten Ansatz: (1) heftiges Anfangs-Zittern, weil bei
      // alpha=1 die Kraft überschwingt, und (2) ein langsames Zusammenziehen zu einer engen
      // Scheibe über Zeit, weil die abklingende Charge-Kraft irgendwann schwächer wird als die
      // konstante Ring-Anziehung. Direktes Setzen hält den Ring exakt auf Radius/Neigung/Spin,
      // unabhängig vom Simulationszustand.
      //
      // Winkel kommt aus einem festen Index (gleich große Kreis-Segmente) statt direkt aus dem
      // ID-Hash — der Hash allein verteilte sich nicht gleichmäßig genug und ließ Knoten in
      // Klumpen/Strähnen zusammenlaufen. Der Hash liefert nur noch einen kleinen Jitter *innerhalb*
      // des eigenen Segments, damit es organisch wirkt, ohne dass Nachbarn sich überlappen können.
      const index = ringIndexById.get(n.id) ?? 0
      const jitter = (phaseFromId(n.id) / 1000 - 0.5) * slice * 0.5
      const angle = index * slice + jitter + spin

      // Querschnitt als gefüllter Kreis (Torus-Röhre) statt unabhängigem Radial-/Z-Jitter — das
      // ergab vorher eine flache, rechteckige Scheibe. Wurzel auf den Füll-Faktor verteilt Punkte
      // gleichmäßig über die Kreisfläche statt sie in der Mitte zu häufen.
      const crossAngle = (phaseFromId(`${n.id}c`) / 1000) * Math.PI * 2
      const crossFill = Math.sqrt(phaseFromId(`${n.id}r`) / 1000)
      const crossR = tubeRadius * crossFill
      const radius = ringRadius + crossR * Math.cos(crossAngle)
      const zJitter = crossR * Math.sin(crossAngle)
      const ryFlat = Math.sin(angle) * radius

      n.x = Math.cos(angle) * radius
      n.y = ryFlat * Math.cos(tiltRad) - zJitter * Math.sin(tiltRad)
      if (n.z != null) n.z = ryFlat * Math.sin(tiltRad) + zJitter * Math.cos(tiltRad)
      n.vx = 0
      n.vy = 0
      if (n.z != null) n.vz = 0
    }
  }

  force.initialize = (nodes: ForceNode[]) => {
    simNodes = nodes
    // Stabile Reihenfolge nach ID, damit die Zuordnung bei einem Re-Init (Filter/Fokus ändert
    // sich) für gleichbleibende IDs stabil bleibt statt bei jedem Mal neu zu würfeln.
    const ringNodes = nodes
      .filter((n) => (degreeById.get(n.id) ?? 0) === 0)
      .sort((a, b) => a.id.localeCompare(b.id))
    ringIndexById = new Map(ringNodes.map((n, i) => [n.id, i]))
    ringCount = ringNodes.length
  }

  return force
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

  // react-force-graph-2d/3d werden per next/dynamic geladen — die generischen Prop-Typen der
  // Module gehen dabei verloren, daher hier bewusst `any` statt gegen ForceGraphMethods<> zu kämpfen.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null)
  const [graphReady, setGraphReady] = useState(false)
  const [renderMode, setRenderMode] = useState<RenderMode>('3d')
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>()

  // Beim Wechsel 2D<->3D wird die jeweils andere Komponente neu gemountet (eigene Simulation,
  // eigenes Koordinatensystem) — ihr Ref ist erst gesetzt, sobald der Code-Split-Chunk geladen
  // UND gemountet ist. Ein Callback-Ref passt nicht zum getypten MutableRefObject der Bibliothek,
  // daher hier kurz pollen statt darauf zu warten.
  useEffect(() => {
    setGraphReady(false)
    graphRef.current = null
    nodeVisualsRef.current.clear()
    simNodeRegistryRef.current.clear()
    let raf: number
    const check = () => {
      if (graphRef.current) setGraphReady(true)
      else raf = requestAnimationFrame(check)
    }
    check()
    return () => cancelAnimationFrame(raf)
  }, [renderMode])

  // Von onEngineTick gelesene "Live"-Werte — als Refs statt State, damit der Tick-Handler nicht
  // bei jedem Hover/Klick neu erzeugt werden muss (er läuft potenziell 60x/Sekunde).
  const nodeVisualsRef = useRef<Map<string, NodeVisual>>(new Map())
  // Registry der live simulierten Node-Objekte (mit aktuellen x/y/z) — befüllt aus den
  // Render-Callbacks (die immer die tatsächlichen, von der Simulation mutierten Objekte
  // bekommen). Ersetzt `graphRef.current.graphData()`, das je nach Bibliotheksversion als
  // Ref-Methode fehlen kann (siehe Runtime-Error "graphData is not a function").
  const simNodeRegistryRef = useRef<Map<string, SimNode>>(new Map())
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

  /** Grad (Anzahl Kanten) je Knoten — steuert u.a., welche Knoten als "verbunden" gelten (Radial-Kraft). */
  const degreeById = useMemo(() => {
    const degrees = new Map<string, number>()
    for (const e of filteredEdges) {
      degrees.set(e.source, (degrees.get(e.source) ?? 0) + 1)
      degrees.set(e.target, (degrees.get(e.target) ?? 0) + 1)
    }
    return degrees
  }, [filteredEdges])

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
   * Dämpfung — der Graph soll sich fortlaufend leicht bewegen statt nach dem Einpendeln einzufrieren.
   * Nur im 3D-Modus, die 2D-Ansicht bleibt bei ihrer ursprünglichen (bereits als gut befundenen) Physik. */
  useEffect(() => {
    if (!graphReady || renderMode !== '3d') return
    const fg = graphRef.current
    if (!fg) return
    const charge = fg.d3Force('charge')
    // Stärkere Abstoßung + größere Reichweite: nicht direkt verlinkte Cluster schieben sich
    // spürbarer voneinander weg, statt als ein zusammenhängender Strang zu wirken.
    if (charge) charge.strength(-520).distanceMax(1400)
    const link = fg.d3Force('link')
    if (link) link.distance(190)
    const center = fg.d3Force('center')
    // Noch schwächerer Zug zur Mitte, damit sich Gruppen frei auseinanderschieben können statt
    // alle Richtung Ursprung zusammengehalten zu werden.
    if (center) center.strength(0.006)
    fg.d3Force('radialSpread', createRadialSpreadForce(degreeById))

    // Kamera neu einrahmen: Der Ring ist inzwischen deutlich größer als die Default-Framing-
    // Distanz der Bibliothek (die beim allerersten Mount berechnet wird, bevor unsere Kraft die
    // finale Ring-Größe gesetzt hat). Ohne das steckt die Kamera zu nah "im" Ring und man sieht
    // nur einen flachen Ausschnitt ("Platte") statt der ganzen Kreisform. Kurzer Timeout, damit
    // die warmupTicks-Positionen sicher angewendet sind, bevor die Bounding-Box berechnet wird.
    const fitTimer = setTimeout(() => {
      fg.zoomToFit?.(800, 80)
    }, 120)
    return () => clearTimeout(fitTimer)
  }, [graphReady, renderMode, filteredNodes, filteredEdges, degreeById])

  /** Sanfte Kamera-Rotation im Leerlauf — nur im 3D-Modus (OrbitControls), pausiert sofort bei
   * Drag/Zoom, setzt nach kurzer Pause wieder ein. */
  useEffect(() => {
    if (!graphReady || renderMode !== '3d') return
    const fg = graphRef.current
    const controls = fg?.controls?.()
    if (!controls) return
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.6
    // Dämpfung/Trägheit für alle Controls-Interaktionen (Rotieren, Zoomen, Pannen) — ohne das
    // folgt die Kamera 1:1 und ruckartig der Maus, mit Damping schwingt sie sanft nach.
    // Erfordert controls.update() im Render-Loop, das die Lib wegen autoRotate ohnehin schon aufruft.
    controls.enableDamping = true
    controls.dampingFactor = 100
    // Mittlere Maustaste (Mausrad gedrückt halten) verschiebt die Szene (Pan) statt zu zoomen —
    // Zoomen bleibt weiterhin per Scrollen möglich.
    controls.mouseButtons = {
      ...controls.mouseButtons,
      MIDDLE: THREE.MOUSE.PAN,
    }
    controls.enablePan = true
    controls.panSpeed = 0.05
    controls.screenSpacePanning = true
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
  }, [graphReady, renderMode])

  const graphData = useMemo(
    () => ({
      nodes: filteredNodes.map((n) => ({ ...n })),
      links: filteredEdges.map((e) => ({ ...e }) as SimEdge),
    }),
    [filteredNodes, filteredEdges]
  )

  // THREE.Color parst kein `rgba(...)` mit Alpha-Kanal (anders als der 2D-Canvas-Context) — im
  // 3D-Modus brauchen die "gedimmt"-Fälle deshalb einen dunklen Vollton statt echter Transparenz
  // (die Basis-Deckkraft kommt dort über die globale `linkOpacity`-Prop); im 2D-Modus funktioniert
  // die ursprüngliche rgba-Transparenz wie gehabt direkt im Canvas-Context.
  /** 3D: Kantenfarbe passt sich den Typ-Farben von Start-/Zielknoten an — bei zwei unterschiedlichen
   * Farben eine Mischfarbe (kein echter Verlauf: `linkColor` kann pro Kante nur einen einzelnen,
   * per `new THREE.Color()` parsbaren Wert liefern; ein Array dafür wird von der Bibliothek nicht
   * unterstützt und fiel unbemerkt auf Schwarz zurück — daher die Mischung statt eines Arrays). */
  const linkColor = useCallback(
    (link: unknown) => {
      const l = link as SimEdge
      const sourceId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
      const targetId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
      const isDimmed = connectedToHover != null && !(connectedToHover.has(sourceId) && connectedToHover.has(targetId))

      if (renderMode === '3d') {
        if (isDimmed) return '#3a3a3a'
        const sourceColor = colorForType(nodesById.get(sourceId)?.type ?? 'other')
        const targetColor = colorForType(nodesById.get(targetId)?.type ?? 'other')
        return sourceColor === targetColor ? sourceColor : mixHexColors(sourceColor, targetColor)
      }
      return isDimmed ? 'rgba(255,255,255,0.06)' : 'rgba(155,144,245,0.75)'
    },
    [connectedToHover, renderMode, nodesById]
  )

  /** Partikel übernehmen die Farbe des Zielknotens (statt eines fixen Fliedertons) — passt so zum
   * neuen Kanten-Gradient und macht die Flussrichtung farblich erkennbar. */
  const particleColor = useCallback(
    (link: unknown) => {
      const l = link as SimEdge
      const sourceId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
      const targetId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
      const isDimmed = connectedToHover != null && !(connectedToHover.has(sourceId) && connectedToHover.has(targetId))
      if (isDimmed) return renderMode === '3d' ? '#0a0a0a' : 'rgba(0,0,0,0)'
      if (renderMode === '3d') return colorForType(nodesById.get(targetId)?.type ?? 'other')
      return '#b0a8f0'
    },
    [connectedToHover, renderMode, nodesById]
  )

  /** Eigenes Rendering statt nodeColor/nodeCanvasObject-Default (nur 2D-Modus): pulsierender
   * Glow + heller Kern, damit die Knoten wirken, als würden sie leuchten/kommunizieren. */
  const nodeCanvasObject = useCallback(
    (node: unknown, ctx: CanvasRenderingContext2D) => {
      const n = node as SimNode
      simNodeRegistryRef.current.set(n.id, n)
      if (n.x == null || n.y == null) return

      const isDimmed = connectedToHover != null && !connectedToHover.has(n.id)
      const color = colorForType(n.type)
      const baseR = radiusForType(n.type, NODE_RADIUS_2D)

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
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.fill()
      }
    },
    [connectedToHover]
  )

  const nodePointerAreaPaint = useCallback((node: unknown, color: string, ctx: CanvasRenderingContext2D) => {
    const n = node as SimNode
    if (n.x == null || n.y == null) return
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(n.x, n.y, radiusForType(n.type, NODE_RADIUS_2D) + 3, 0, 2 * Math.PI)
    ctx.fill()
  }, [])

  /** Baut pro Knoten eine Kern-Kugel + eine additive Glow-Hülle. Größe nach Entitäts-Typ (Kunden
   * am größten, Projekte kleiner, Rest am kleinsten) statt nach Grad — im 3D-Raum mit
   * Kamera-Perspektive wirken kleine Kugeln sonst wie Staubkörner. Farbe/Gruppierung bleiben
   * unverändert über `colorForType`. */
  const nodeThreeObject = useCallback(
    (node: unknown) => {
      const n = node as SimNode
      simNodeRegistryRef.current.set(n.id, n)
      const color = colorForType(n.type)
      const baseR = radiusForType(n.type, NODE_RADIUS_3D)

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
    []
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
    const simNode = simNodeRegistryRef.current.get(match.id)
    if (simNode) focusOnNode(simNode)
  }

  /** Fokussiert einen simulierten Knoten — im 3D-Modus per Kameraflug (Standard-"Fokus"-Rezept
   * für react-force-graph-3d: entlang der Blickrichtung Knoten↔Ursprung zurückweichen), im
   * 2D-Modus per centerAt()/zoom() wie ursprünglich. */
  function focusOnNode(simNode: SimNode) {
    const fg = graphRef.current
    if (!fg || simNode.x == null || simNode.y == null) return
    if (renderMode === '3d') {
      const nx = simNode.x
      const ny = simNode.y
      const nz = simNode.z ?? 0
      const dist = Math.hypot(nx, ny, nz)
      const distRatio = dist > 0 ? 1 + FOCUS_DISTANCE_3D / dist : 1
      fg.cameraPosition({ x: nx * distRatio, y: ny * distRatio, z: nz * distRatio }, { x: nx, y: ny, z: nz }, 1000)
    } else {
      fg.centerAt(simNode.x, simNode.y, 800)
      fg.zoom(FOCUS_ZOOM_2D, 800)
    }
  }

  /** Springt von einer Referenz im NodePanel direkt zum verlinkten Knoten — schaltet dessen Typ
   * bei Bedarf sichtbar (analog zu "Nachbarschaft laden") und fliegt die Kamera dorthin. */
  function selectNodeById(id: string) {
    const match = nodesById.get(id)
    if (!match) return
    setSelectedNode(match)
    setVisibleTypes((prev) => (prev.has(match.type) ? prev : new Set(prev).add(match.type)))
    const simNode = simNodeRegistryRef.current.get(id)
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
        {renderMode === '3d' ? (
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
            linkOpacity={0.95}
            // Weltmaßstab ist inzwischen sehr groß (Ring-Radius ~1000) — eine dünne Linie wie
            // vorher (1.2) ging darin optisch unter, deshalb deutlich dicker skaliert.
            linkWidth={1.2}
            linkDirectionalArrowLength={7}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={3}
            linkDirectionalParticleWidth={4.5}
            linkDirectionalParticleSpeed={0.006}
            linkDirectionalParticleColor={particleColor}
            cooldownTime={Infinity}
            warmupTicks={150}
            d3AlphaDecay={0.006}
            d3VelocityDecay={0.35}
            onEngineTick={handleEngineTick}
            onNodeClick={(node: unknown) => setSelectedNode(node as GraphNode)}
            onNodeHover={(node: unknown) => setHoveredId((node as GraphNode | null)?.id ?? null)}
          />
        ) : (
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
            linkWidth={1.8}
            linkDirectionalArrowLength={4}
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
        )}
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
            renderMode={renderMode}
            onRenderModeChange={setRenderMode}
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
