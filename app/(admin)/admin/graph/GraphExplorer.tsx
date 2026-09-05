'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import * as THREE from 'three'
import { FilterPanel, type RenderMode, type TypeCount } from './FilterPanel'
import { NodePanel } from './NodePanel'
import { colorForNode, hexToRgba, type GraphEdge, type GraphNode, type GraphPayload } from './types'

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

// ── Overlay-Geometrie ──────────────────────────────────────────────────────
// Der Graph-Canvas liegt `absolute inset-0` unter den Panels — die Panels verdecken also einen
// Teil davon, ohne dass der Canvas dadurch kleiner würde. Die 2D-Einrahmung zieht diesen
// verdeckten Anteil ab, sonst zentriert sich der Graph auf die geometrische Canvas-Mitte und
// liegt zur Hälfte hinter dem Filter-Panel.
// Bewusst NUR für 2D: die 3D-Kamera rahmt weiterhin mittig ein. Ein seitlicher Versatz müsste
// dort über den LookAt-Punkt laufen, und die Auto-Rotation kreist um genau diesen Punkt — der
// Graph würde bei jeder Umdrehung in den verdeckten Bereich hinein- und wieder herausschwingen.
/** Ab hier ist das Filter-Panel dauerhaft offen (Tailwind `lg`) — darunter Bottom-Sheet. */
const DESKTOP_PANEL_QUERY = '(min-width: 1024px)'
/** left-5 (20px) + w-72 (288px) + 20px Sicherheitsabstand. */
const FILTER_PANEL_INSET = 328
/** sm:w-96 (384px) + 20px Sicherheitsabstand. */
const NODE_PANEL_INSET = 404
/** Unter dieser freien Breite lohnt das Ausweichen nicht mehr — dann lieber mittig einrahmen
 * und die Panels teilweise überlappen lassen, statt den Graphen in einen Streifen zu quetschen. */
const MIN_FREE_WIDTH = 300

// ── 2D-Layout ──────────────────────────────────────────────────────────────
/** Mindest-Bogenabstand zwischen zwei benachbarten Ring-Knoten (Welteinheiten). Der Jitter
 * (RING_JITTER_2D) zieht davon im ungünstigsten Fall noch seinen Anteil ab — 38 * (1 - 0.2)
 * lässt gut 30 Einheiten übrig, klar mehr als der Knotendurchmesser von 16. */
const RING_MIN_SPACING_2D = 38
/** Zufällige (aber pro Knoten stabile) Auslenkung innerhalb des eigenen Segments, als Anteil der
 * Segmentbreite — macht den Ring organisch statt wie ein Zifferblatt. */
const RING_JITTER_2D = 0.2
/** Radialer Abstand zweier aufeinanderfolgender Ringe. */
const RING_GAP_2D = 52
/** Rasterweite der Kollisionsauflösung. Muss mindestens so groß sein wie die größtmögliche Summe
 * zweier Kollisionsradien, sonst findet die Suche über die 8 Nachbarzellen nicht alle Überlappungen. */
const COLLIDE_CELL_2D = 104
/** Anteil der Überlappung, der pro Tick ausgeglichen wird (d3s forceCollide nutzt denselben Wert).
 * Kleiner = weicher, größer = härter und unruhiger. */
const COLLIDE_STRENGTH_2D = 0.7
/** Grenzen für die Ellipsen-Streckung des Ring-Layouts (Breite/Höhe des freien Bereichs).
 * Jenseits davon würde der Graph zu einem Band ausgewalzt, das man nicht mehr als Ganzes liest. */
const LAYOUT_ASPECT_MIN = 0.5
const LAYOUT_ASPECT_MAX = 2
/** Ab welchem Zoom ein Knotentyp beschriftet wird. Ohne diese Abstufung wären in der Übersicht
 * alle ~800 Labels gleichzeitig sichtbar und würden zu einem grauen Textteppich verschmelzen —
 * Kunden tragen ihr Label immer, alles Feinkörnige erscheint erst beim Hineinzoomen. */
const LABEL_ZOOM_2D: Record<string, number> = { client: 0.25, project: 0.9, other: 1.2 }

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
  /** Nur bei beschrifteten Knotentypen gesetzt (Kunden/Projekte) — wird beim Dimmen mit ausgeblendet. */
  labelMaterial?: THREE.SpriteMaterial
}

function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 1500, height: 1000 })
  const observerRef = useRef<ResizeObserver | null>(null)

  /**
   * Bewusst ein Callback-Ref statt `useRef` + `useEffect(fn, [])`: diese Komponente
   * hat vorher liegende `return`-Zweige für Lade-/Fehlerzustand, die den
   * Container-Div (mit diesem Ref) noch gar nicht rendern. Ein Effect mit leerem
   * Dependency-Array läuft genau EINMAL, direkt nach dem ALLERERSTEN Commit —
   * war das der Lade-Zweig, ist `ref.current` dort `null`, der Effect bricht sofort
   * ab und läuft (wegen `[]`) nie wieder, auch nachdem der echte Container später
   * erscheint. Ergebnis: `size` blieb für immer beim Fallback (1500×1000,
   * Desktop-Seitenverhältnis), der WebGL-Canvas übernahm genau diese falsche
   * Größe (nachgewiesen per getBoundingClientRect: 1500×1000 statt tatsächlich
   * 375×756 auf einem Mobile-Viewport) — der Graph wurde dadurch mit falscher
   * Kamera-Framing-Mathematik fast komplett aus dem sichtbaren Bereich heraus
   * positioniert. Ein Callback-Ref feuert dagegen bei JEDEM Mount/Unmount des
   * Elements, unabhängig davon, auf welchem Render-Durchlauf das passiert.
   */
  const ref = useCallback((el: T | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!el) return

    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) setSize({ width: rect.width, height: rect.height })

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    observerRef.current = observer
  }, [])

  return { ref, size }
}

/** Liest einen CSS-Media-Query in JS aus — nötig, weil die Einrahmungs-Mathematik wissen muss,
 * ob das Filter-Panel gerade dauerhaft offen ist (Tailwind-Klassen sind für JS unsichtbar).
 * Über `useSyncExternalStore` statt State+Effect: matchMedia ist ein externer Store, und der
 * Server-Snapshot (`false`) hält SSR und ersten Client-Render deckungsgleich. */
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onStoreChange)
      return () => mq.removeEventListener('change', onStoreChange)
    },
    [query]
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
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

/** Kürzt lange Knoten-Labels für die Canvas-Beschriftung — ungekürzt überlappen sich im 2D-Graph
 * schon bei mittlerer Dichte die Namen benachbarter Knoten. */
function truncateLabel(label: string, max = 24): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label
}

/** Schriftfamilie für Canvas-Labels. `ctx.font` versteht keine CSS-Variablen, deshalb wird der
 * von next/font gesetzte Wert einmalig aus dem Root-Element ausgelesen und gecacht — so tragen
 * die Graph-Labels dieselbe Schrift wie der Rest des Backoffice statt einer System-Ersatzschrift. */
let cachedLabelFont: string | null = null
function labelFontFamily(): string {
  if (cachedLabelFont) return cachedLabelFont
  const fromVar =
    typeof window === 'undefined'
      ? ''
      : getComputedStyle(document.documentElement).getPropertyValue('--font-dm-sans').trim()
  cachedLabelFont = fromVar || 'system-ui, sans-serif'
  return cachedLabelFont
}

/**
 * Baut ein Text-Sprite für die 3D-Ansicht (Sprites richten sich in three.js immer zur Kamera aus,
 * die Beschriftung bleibt also aus jedem Blickwinkel lesbar). Kein `three-spritetext` als extra
 * Abhängigkeit — ein Canvas als Textur reicht und erlaubt gleich die dunkle Kontur, die den Text
 * über hellen Knoten/Kanten lesbar hält.
 */
function makeLabelSprite(text: string): THREE.Sprite {
  const fontPx = 48
  const padding = 16
  const font = `600 ${fontPx}px ${labelFontFamily()}`

  const canvas = document.createElement('canvas')
  const measureCtx = canvas.getContext('2d')!
  measureCtx.font = font
  const width = Math.ceil(measureCtx.measureText(text).width) + padding * 2
  const height = fontPx + padding * 2

  // Achtung: das Setzen von width/height setzt den 2D-Context komplett zurück (inkl. Font) —
  // erst danach zeichnen, sonst landet alles in der Default-Schrift.
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.font = font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 8
  ctx.strokeStyle = 'rgba(8,8,8,0.85)'
  ctx.strokeText(text, width / 2, height / 2)
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fillText(text, width / 2, height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(material)
  // Feste Welt-Höhe, Breite über das Seitenverhältnis: dadurch wirken alle Labels gleich groß,
  // unabhängig davon, wie lang der Name ist.
  const worldHeight = 34
  sprite.scale.set((width / height) * worldHeight, worldHeight, 1)
  return sprite
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
const NODE_RADIUS_2D = { client: 22, project: 15, other: 8 }
/** Persönlicher Mindestabstand je Knoten im 2D-Layout (Kreisradius für die Kollisionsauflösung).
 * Deutlich größer als der gezeichnete Kern: der Glow-Halo und das Label darunter brauchen Platz,
 * sonst verschmelzen benachbarte Knoten optisch zu einem Fleck — genau der Effekt, der die
 * 2D-Ansicht vorher "eng und unsauber" wirken ließ. */
const COLLIDE_RADIUS_2D = { client: 52, project: 40, other: 28 }

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
  // Langsam nachlaufender "Ankerpunkt" pro verbundenem Knoten — folgt der physikbestimmten
  // Position (Link-/Charge-/Center-Kraft), aber OHNE die eigene Schwebe-Bewegung mit
  // einzurechnen. Die tatsächliche Position wird danach wie beim Ring direkt gesetzt
  // (Anker + kleiner, fester Versatz) statt über Geschwindigkeit aufaddiert — kann also nie
  // dauerhaft wegdriften, unabhängig davon, wie viele Ticks vergehen.
  let anchorById = new Map<string, { x: number; y: number; z: number }>()
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
    // Sanftes, dauerhaftes "Schweben" (nicht mit Alpha skaliert, läuft also auch nach dem
    // Einpendeln der Simulation weiter) — pro Knoten eigene Phase/Frequenz aus dem ID-Hash,
    // damit sich nicht alle synchron im Gleichtakt bewegen. Innere (verbundene) Knoten
    // schweben deutlich langsamer als der äußere Ring — sonst wirkt der dichte Cluster hektisch.
    const floatT = Date.now() / 26000
    const floatTInner = Date.now() / 70000

    for (const n of simNodes) {
      if (n.x == null || n.y == null) continue
      const degree = degreeById.get(n.id) ?? 0

      if (degree > 0) {
        // Verbundene ("innere") Knoten: genau wie beim Ring wird die Position direkt gesetzt
        // (nicht über Geschwindigkeit aufaddiert) — kann also nie dauerhaft wegdriften. Der
        // Anker läuft der physikbestimmten Position (Link-/Charge-/Center-Kraft) langsam nach:
        // `n.vx/vy/vz` enthalten an dieser Stelle bereits deren Beitrag für diesen Tick (die
        // Kräfte laufen vor dieser custom Force), wir integrieren ihn hier selbst in den Anker
        // statt ihn über die normale Geschwindigkeits-Integration wirken zu lassen. Die eigene
        // Schwebe-Bewegung bleibt dadurch komplett von dieser physikbestimmten Basis getrennt.
        let anchor = anchorById.get(n.id)
        if (!anchor) {
          anchor = { x: n.x, y: n.y, z: n.z ?? 0 }
          anchorById.set(n.id, anchor)
        }
        anchor.x += (n.vx ?? 0) - n.x * centerK * 0.5
        anchor.y += (n.vy ?? 0) - n.y * centerK * 0.5
        anchor.z += (n.vz ?? 0) - (n.z ?? 0) * centerK * 0.5

        const floatStrength = 14
        n.x = anchor.x + Math.sin(floatTInner + phaseFromId(n.id)) * floatStrength
        n.y = anchor.y + Math.cos(floatTInner * 0.85 + phaseFromId(`${n.id}fy`)) * floatStrength
        if (n.z != null) n.z = anchor.z + Math.sin(floatTInner * 0.7 + phaseFromId(`${n.id}fz`)) * floatStrength
        n.vx = 0
        n.vy = 0
        if (n.z != null) n.vz = 0
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

      // Kleine Schwebe-Auslenkung um die exakte Ring-Position, damit die äußeren Knoten nicht
      // komplett starr wirken — Amplitude bewusst klein gegenüber Ring-/Röhren-Radius.
      const floatAmp = 5
      const floatX = Math.sin(floatT + phaseFromId(`${n.id}fx`)) * floatAmp
      const floatY = Math.cos(floatT * 0.8 + phaseFromId(`${n.id}fy`)) * floatAmp
      const floatZ = Math.sin(floatT * 0.65 + phaseFromId(`${n.id}fz`)) * floatAmp

      n.x = Math.cos(angle) * radius + floatX
      n.y = ryFlat * Math.cos(tiltRad) - zJitter * Math.sin(tiltRad) + floatY
      if (n.z != null) n.z = ryFlat * Math.sin(tiltRad) + zJitter * Math.cos(tiltRad) + floatZ
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
    anchorById = new Map()
  }

  return force
}

/**
 * Schiebt überlappende Knoten auseinander (Pendant zu d3's `forceCollide`, aber ohne den
 * transitiven `d3-force-3d`-Import direkt anzuziehen). Statt aller Paare (O(n²), bei bis zu 800
 * Knoten pro Tick zu teuer) läuft es über ein Raster: jeder Knoten landet in einer Zelle von
 * COLLIDE_CELL_2D Kantenlänge, verglichen wird nur mit den 8 Nachbarzellen. Damit ist es linear
 * in der Knotenzahl und läuft auch auf dem Handy in 60fps durch.
 *
 * `movable` entscheidet, wer ausweicht: Ring-Knoten sitzen auf einem konstruierten Platz und
 * dürfen nicht verschoben werden — trifft ein Cluster-Knoten auf einen Ring-Knoten, weicht also
 * nur der Cluster-Knoten aus (und zwar um den vollen Betrag). Ohne das könnte ein größer als
 * geschätzt gewachsener Cluster ungebremst in den Ring hineinragen.
 *
 * Korrigiert wird die GESCHWINDIGKEIT, nicht die Position — und gerechnet wird mit der Position
 * nach diesem Tick (`x + vx`), genau wie in d3s forceCollide. Die erste Fassung hat stattdessen
 * `x`/`y` direkt verschoben und `vx`/`vy` unangetastet gelassen: der Knoten wurde damit im
 * nächsten Tick von seiner unveränderten Geschwindigkeit wieder in die Überlappung hineingetragen
 * und im übernächsten wieder herausgeschoben. Diese Rückkopplung lief endlos weiter und war die
 * Ursache dafür, dass die 2D-Ansicht dauerhaft gezittert hat. Über die Geschwindigkeit wirkt
 * stattdessen `d3VelocityDecay` dämpfend, und die Simulation kann sich einpendeln.
 */
function separateOverlapping(nodes: ForceNode[], movable: Set<string>) {
  if (nodes.length < 2) return
  const grid = new Map<string, ForceNode[]>()
  for (const n of nodes) {
    if (n.x == null || n.y == null) continue
    const key = `${Math.floor(n.x / COLLIDE_CELL_2D)}:${Math.floor(n.y / COLLIDE_CELL_2D)}`
    const bucket = grid.get(key)
    if (bucket) bucket.push(n)
    else grid.set(key, [n])
  }

  for (const [key, bucket] of grid) {
    const sep = key.indexOf(':')
    const gx = Number(key.slice(0, sep))
    const gy = Number(key.slice(sep + 1))

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighbors = dx === 0 && dy === 0 ? bucket : grid.get(`${gx + dx}:${gy + dy}`)
        if (!neighbors) continue
        for (const a of bucket) {
          const aMovable = movable.has(a.id)
          for (const b of neighbors) {
            // Jedes Paar genau einmal auflösen (und niemals mit sich selbst). Der ID-Vergleich
            // greift auch über Zellgrenzen hinweg: das Paar wird sonst ein zweites Mal besucht,
            // wenn die Nachbarzelle selbst an der Reihe ist.
            if (a.id >= b.id) continue
            const bMovable = movable.has(b.id)
            if (!aMovable && !bMovable) continue

            const minDist = collideRadius(a) + collideRadius(b)
            let ox = (b.x ?? 0) + (b.vx ?? 0) - (a.x ?? 0) - (a.vx ?? 0)
            let oy = (b.y ?? 0) + (b.vy ?? 0) - (a.y ?? 0) - (a.vy ?? 0)
            let dist = Math.hypot(ox, oy)
            if (dist >= minDist) continue
            if (dist < 0.001) {
              // Exakt deckungsgleich: deterministische Richtung aus dem ID-Hash, sonst würden die
              // beiden Knoten für immer ineinander stecken bleiben (0/0 lässt sich nicht normieren).
              const angle = (phaseFromId(a.id) / 1000) * Math.PI * 2
              ox = Math.cos(angle)
              oy = Math.sin(angle)
              dist = 1
            }
            // Beide beweglich -> jeder die Hälfte; nur einer beweglich -> der trägt alles.
            const scale = ((minDist - dist) / dist) * COLLIDE_STRENGTH_2D
            const share = aMovable && bMovable ? 0.5 : 1
            const ux = ox * scale * share
            const uy = oy * scale * share
            if (aMovable) {
              a.vx = (a.vx ?? 0) - ux
              a.vy = (a.vy ?? 0) - uy
            }
            if (bMovable) {
              b.vx = (b.vx ?? 0) + ux
              b.vy = (b.vy ?? 0) + uy
            }
          }
        }
      }
    }
  }
}

function collideRadius(n: ForceNode): number {
  return radiusForType(n.type, COLLIDE_RADIUS_2D)
}

/**
 * Tabelle der kumulierten Bogenlänge einer Ellipse (numerisch über 720 Schritte). Grundlage für
 * eine Verteilung nach Bogenlänge statt nach Winkel: bei gleichmäßigen Winkelschritten drängen
 * sich die Punkte an den Enden der KURZEN Halbachse zusammen und reißen an den Enden der langen
 * auseinander — je flacher die Ellipse, desto stärker. Genau der ungleichmäßige Abstand, den das
 * Ring-Layout vermeiden soll.
 */
const ELLIPSE_STEPS = 720
function ellipseArcTable(a: number, b: number): { cum: Float64Array; total: number } {
  const cum = new Float64Array(ELLIPSE_STEPS + 1)
  const dt = (Math.PI * 2) / ELLIPSE_STEPS
  for (let i = 1; i <= ELLIPSE_STEPS; i++) {
    // Mittelpunktsregel: Geschwindigkeit |d/dt (a cos t, b sin t)| in der Segmentmitte.
    const t = (i - 0.5) * dt
    cum[i] = cum[i - 1] + Math.hypot(a * Math.sin(t), b * Math.cos(t)) * dt
  }
  return { cum, total: cum[ELLIPSE_STEPS] }
}

/** Liefert `count` Parameter-Winkel, die auf der Ellipse gleiche Bogenabstände ergeben.
 * `offsetSlots` verschiebt die ganze Verteilung um Bruchteile eines Slots (für den Versatz
 * zwischen aufeinanderfolgenden Ringen). */
function ellipseAnglesByArc(table: { cum: Float64Array; total: number }, count: number, offsetSlots: number): number[] {
  const angles: number[] = new Array(count)
  let i = 1
  for (let k = 0; k < count; k++) {
    const target = ((k + offsetSlots) / count) * table.total
    // Zielbogenlängen wachsen monoton -> der Index läuft nur vorwärts (linear statt quadratisch).
    while (i < ELLIPSE_STEPS && table.cum[i] < target) i++
    const segment = table.cum[i] - table.cum[i - 1]
    const frac = segment > 0 ? (target - table.cum[i - 1]) / segment : 0
    angles[k] = ((i - 1 + frac) / ELLIPSE_STEPS) * Math.PI * 2
  }
  return angles
}

/**
 * Übersetzt Canvas-Größe + Overlay-Insets in den tatsächlich frei sichtbaren Bereich.
 * `offsetX` ist die horizontale Verschiebung der freien Mitte gegenüber der Canvas-Mitte
 * (positiv = weiter rechts), mit der die Einrahmung den Graphen aus dem Panel herausrückt.
 * Bleibt zu wenig Platz übrig, wird auf "mittig im ganzen Canvas" zurückgefallen — ein
 * 200px-Streifen wäre unbrauchbarer als eine teilweise verdeckte, aber vollständige Ansicht.
 */
function usableViewport(
  size: { width: number; height: number },
  insets: { left: number; right: number }
): { width: number; height: number; offsetX: number } {
  const height = Math.max(size.height, 1)
  const freeWidth = size.width - insets.left - insets.right
  if (freeWidth < MIN_FREE_WIDTH) {
    return { width: Math.max(size.width, 1), height, offsetX: 0 }
  }
  return { width: freeWidth, height, offsetX: (insets.left - insets.right) / 2 }
}

/**
 * Custom d3-Force (nur 2D) — das flache Pendant zur 3D-Torus-Kraft und der Kern der neuen
 * 2D-Anordnung. Die Bibliotheks-Physik allein erzeugte hier zwei Probleme:
 *
 * 1. Es gibt keine Kollisionsauflösung — Knoten durften sich beliebig überlappen, und bei
 *    Glow-Radien von mehr als dem Doppelten des Kerns verschmolzen dicht stehende Knoten zu
 *    einem einzigen Leuchtfleck.
 * 2. Unverbundene Knoten (Grad 0 — der größte Teil des Graphen, v.a. Leads) hatten gar keine
 *    Layout-Regel. Sie wurden nur von der Charge-Kraft irgendwohin geschoben und lagen als
 *    diffuse, strukturlose Wolke um den Cluster. Im 3D-Modus setzt `createRadialSpreadForce`
 *    sie dagegen sauber auf einen Ring — genau das fehlte in 2D.
 *
 * Lösung analog zum 3D-Ring, nur flach und mehrringig: Grad-0-Knoten bekommen einen festen Platz
 * auf konzentrischen Ringen (Position wird direkt gesetzt, nicht über Federkräfte angenähert —
 * das vermeidet Anfangs-Zittern und langsames Zusammensacken), verbundene Knoten bleiben bei der
 * normalen Force-Simulation und werden nur noch entzerrt.
 *
 * Die Ringe sind Ellipsen im Seitenverhältnis des frei sichtbaren Bereichs (`aspect`), keine
 * Kreise: ein kreisrunder Graph füllt auf einem hochkant gehaltenen Handy nur den mittleren
 * Streifen und lässt oben und unten je ein Viertel des Bildschirms leer — die Einrahmung muss
 * dann viel weiter herauszoomen, als für die Bildschirmfläche nötig wäre. Die Streckung ist
 * flächenerhaltend (sx * sy = 1) und die Knoten werden nach Bogenlänge verteilt, damit der
 * Abstand entlang der Ellipse überall gleich bleibt.
 */
function createPlanarLayoutForce(degreeById: Map<string, number>, aspect: number) {
  let ringSlots = new Map<string, { a: number; b: number; angle: number }>()
  let allNodes: ForceNode[] = []
  let ringNodes: ForceNode[] = []
  let physicsNodes: ForceNode[] = []
  let movableIds = new Set<string>()
  /** Halbachsen der Ellipse, die die physikbestimmten Knoten nicht verlassen dürfen
   * (0 = keine Ringe, also keine Begrenzung nötig). */
  let clusterBoundA = 0
  let clusterBoundB = 0

  const sx = Math.sqrt(aspect)
  const sy = 1 / sx

  function force() {
    // Ring-Knoten sitzen exakt auf ihrem Platz — ohne Schwebe-Animation. Die 2D-Ansicht soll
    // ruhig stehen (anders als die 3D-Ansicht, die bewusst dauerhaft treibt); jede zusätzliche
    // Dauerbewegung liest sich hier als Wackeln statt als Lebendigkeit.
    for (const n of ringNodes) {
      const slot = ringSlots.get(n.id)
      if (!slot) continue
      n.x = Math.cos(slot.angle) * slot.a
      n.y = Math.sin(slot.angle) * slot.b
      n.vx = 0
      n.vy = 0
    }

    // Begrenzung des Clusters auf die Fläche innerhalb des ersten Rings. Die Ringgrößen werden
    // beim Init aus einer Schätzung der Clustergröße abgeleitet — fällt der Cluster größer aus
    // als geschätzt (stark verlinkte Daten), würde er sonst in den Ring hineinragen und ihn
    // optisch zerfransen. Bewusst als weicher Zug über die Geschwindigkeit statt als harter
    // Anschlag: ein Zurückklemmen der Position erzeugt zusammen mit der nach außen drückenden
    // Charge-Kraft ein dauerhaftes Vibrieren am Rand.
    if (clusterBoundA > 0) {
      for (const n of physicsNodes) {
        if (n.x == null || n.y == null) continue
        // t > 1 heißt: außerhalb der Grenz-Ellipse. `1 - 1/t` ist der relative Überstand.
        const t = Math.hypot(n.x / clusterBoundA, n.y / clusterBoundB)
        if (t <= 1) continue
        const pull = (1 - 1 / t) * 0.3
        n.vx = (n.vx ?? 0) - n.x * pull
        n.vy = (n.vy ?? 0) - n.y * pull
      }
    }

    // Ring-Knoten kommen mit ins Raster (damit der Cluster an ihnen abprallt), verschoben werden
    // aber nur die physikbestimmten — siehe `movable` in separateOverlapping.
    separateOverlapping(allNodes, movableIds)
  }

  force.initialize = (nodes: ForceNode[]) => {
    allNodes = nodes
    physicsNodes = nodes.filter((n) => (degreeById.get(n.id) ?? 0) > 0)
    movableIds = new Set(physicsNodes.map((n) => n.id))

    // Nach Typ + Label sortiert (nicht nach der zufälligen UUID): gleiche Entitätstypen landen
    // dadurch als zusammenhängender, gleichfarbiger Bogen auf dem Ring statt bunt durchmischt,
    // und innerhalb eines Typs stehen sie alphabetisch — beides macht den Ring lesbar statt
    // nur dekorativ. Die Sortierung ist rein datenabhängig, bleibt also über Re-Inits stabil.
    ringNodes = nodes
      .filter((n) => (degreeById.get(n.id) ?? 0) === 0)
      .sort((a, b) => (a.type === b.type ? a.label.localeCompare(b.label) : a.type.localeCompare(b.type)))

    // Startradius so wählen, dass der innere Cluster nie in den ersten Ring hineinwächst.
    // sqrt(n), weil eine Force-Layout-Wolke flächig wächst, ihr Radius also mit der Wurzel
    // der Knotenzahl skaliert.
    const clusterRadius = physicsNodes.length > 0 ? 110 + 34 * Math.sqrt(physicsNodes.length) : 0
    let radius = clusterRadius + RING_GAP_2D * 2
    // Halber Ring-Gap Sicherheitsabstand nach innen — dort endet der Cluster (siehe force()).
    if (ringNodes.length > 0) {
      const bound = radius - RING_GAP_2D * 0.5 - COLLIDE_RADIUS_2D.client
      clusterBoundA = bound * sx
      clusterBoundB = bound * sy
    } else {
      clusterBoundA = 0
      clusterBoundB = 0
    }

    ringSlots = new Map()
    let placed = 0
    let ringIndex = 0
    while (placed < ringNodes.length) {
      const a = radius * sx
      const b = radius * sy
      const table = ellipseArcTable(a, b)
      // Wie viele Knoten passen auf diesen Umfang, ohne RING_MIN_SPACING_2D zu unterschreiten?
      const capacity = Math.max(8, Math.floor(table.total / RING_MIN_SPACING_2D))
      const take = Math.min(capacity, ringNodes.length - placed)
      // Halben Slot pro Ring versetzt — sonst liegen die Knoten aufeinanderfolgender Ringe auf
      // denselben Strahlen und es entstehen sichtbare Speichen.
      const angles = ellipseAnglesByArc(table, take, (ringIndex % 2) * 0.5)
      const slice = (Math.PI * 2) / take
      for (let k = 0; k < take; k++) {
        const n = ringNodes[placed + k]
        const jitter = (phaseFromId(n.id) / 1000 - 0.5) * slice * RING_JITTER_2D
        ringSlots.set(n.id, { a, b, angle: angles[k] + jitter })
      }
      placed += take
      radius += RING_GAP_2D
      ringIndex++
    }
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
  // Auf Mobile ist kein Platz für das immer offene Filter-Panel (es würde den ganzen Graphen
  // verdecken) — dort startet es eingeklappt und wird über einen kleinen Toggle-Button geöffnet.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // react-force-graph-2d/3d werden per next/dynamic geladen — die generischen Prop-Typen der
  // Module gehen dabei verloren, daher hier bewusst `any` statt gegen ForceGraphMethods<> zu kämpfen.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null)
  const [graphReady, setGraphReady] = useState(false)
  const [renderMode, setRenderMode] = useState<RenderMode>('3d')
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>()
  const desktopPanel = useMediaQuery(DESKTOP_PANEL_QUERY)

  /** Vom Filter-/Node-Panel verdeckte Randbereiche des Canvas (px). Wird beim Einrahmen abgezogen,
   * damit der Graph in den *freien* Bereich zentriert wird statt hinter die Panels.
   *
   * Bewusst als Ref und NICHT als Dependency des Fit-Effects: sonst würde jedes Öffnen des
   * NodePanels (also jeder Klick auf einen Knoten) eine Kamerafahrt auslösen und dem Nutzer
   * genau den Knoten unter den Fingern wegziehen, den er gerade angeklickt hat. Der Wert wird
   * daher nur bei den echten Re-Fit-Anlässen (Resize, Filterwechsel, Moduswechsel) gelesen. */
  /** Die aktuell gültige 2D-Einrahmungsfunktion — damit `onEngineStop` sie aufrufen kann, ohne
   * dass die ForceGraph2D-Props bei jeder Größen-/Filteränderung neu erzeugt werden müssen. */
  const fitRef = useRef<(() => void) | null>(null)

  const viewInsetsRef = useRef({ left: 0, right: 0 })
  useEffect(() => {
    viewInsetsRef.current = {
      left: desktopPanel ? FILTER_PANEL_INSET : 0,
      // Unterhalb von `lg` liegt das NodePanel als (schließbares) Overlay über dem Graphen —
      // dort ist Ausweichen sinnlos, es bliebe kein nutzbarer Rest.
      right: desktopPanel && selectedNode ? NODE_PANEL_INSET : 0,
    }
  }, [desktopPanel, selectedNode])

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
    const result: { id: string; label: string; type: string; status?: string | null }[] = []
    for (const e of edges) {
      let otherId: string | null = null
      if (e.source === selectedNode.id) otherId = e.target
      else if (e.target === selectedNode.id) otherId = e.source
      if (!otherId || seen.has(otherId)) continue
      const other = nodesById.get(otherId)
      if (!other) continue
      seen.add(otherId)
      result.push({ id: other.id, label: other.label, type: other.type, status: other.status })
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

  /** Nur die ID (nicht das ganze Node-Objekt) — als Dependency der Render-Callbacks, damit die
   * nicht bei jedem unveränderten Re-Render neu gebaut werden. */
  const selectedId = selectedNode?.id ?? null

  /** Seitenverhältnis, in das die 2D-Ringe gestreckt werden (Breite/Höhe des frei sichtbaren
   * Bereichs). Bewusst auf Viertelschritte gerundet und ohne das NodePanel gerechnet: der Wert
   * hängt an der Layout-Kraft, jede Änderung baut die Ringzuordnung neu auf — bei ungerundeten
   * Werten würde schon das Ziehen am Fensterrand das Layout pausenlos neu würfeln. */
  const layoutAspect = useMemo(() => {
    const view = usableViewport(
      { width: size.width, height: size.height },
      { left: desktopPanel ? FILTER_PANEL_INSET : 0, right: 0 }
    )
    const raw = view.width / view.height
    return Math.min(Math.max(Math.round(raw * 4) / 4, LAYOUT_ASPECT_MIN), LAYOUT_ASPECT_MAX)
  }, [size.width, size.height, desktopPanel])

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
  }, [graphReady, renderMode, filteredNodes, filteredEdges, degreeById])

  /** 2D-Physik: deutlich mehr Luft als die Bibliotheks-Defaults, plus die eigene Ring-/
   * Kollisions-Kraft (siehe createPlanarLayoutForce).
   *
   * `distanceMax` ist bewusst klein (320) und liegt damit unter dem Startradius des ersten
   * Rings: sonst drückt die geballte Abstoßung der hunderten Ring-Knoten von außen auf den
   * inneren Cluster und presst ihn wieder zu dem dichten Klumpen zusammen, den das Layout
   * gerade auflösen soll. Die Ring-Knoten selbst sind davon unbeeinflusst — ihre Position wird
   * ohnehin direkt gesetzt. */
  useEffect(() => {
    if (!graphReady || renderMode !== '2d') return
    const fg = graphRef.current
    if (!fg) return
    const charge = fg.d3Force('charge')
    if (charge) charge.strength(-260).distanceMax(320)
    const link = fg.d3Force('link')
    if (link) link.distance(115)
    const center = fg.d3Force('center')
    // Schwacher, aber vorhandener Zug zur Mitte: hält den Cluster im Ring zentriert, ohne ihn
    // gegen die Kollisionsauflösung zusammenzuziehen.
    if (center) center.strength(0.03)
    fg.d3Force('planarLayout', createPlanarLayoutForce(degreeById, layoutAspect))
  }, [graphReady, renderMode, filteredNodes, filteredEdges, degreeById, layoutAspect])

  /** Kamera neu einrahmen — bei jedem echten Re-Fit-Anlass: initial (nach warmupTicks), bei
   * Größenänderung des Containers und wenn sich die gefilterte Knotenmenge ändert (z.B.
   * Fokus-Modus). Bewusst NICHT über `fg.zoomToFit()` (dessen interne Formel
   * `paddedFov = (1 - padding*2/state.height) * camera.fov` verrechnet das Padding gegen die
   * reine Pixel-Höhe, und `camera.aspect` kann kurz nach einer Größenänderung noch den alten
   * Wert haben — auf schmalen Mobile-Viewports/direkt nach dem Resize führte das zu einer
   * falschen Kamera-Distanz und einem leeren/schwarzen Bild). Stattdessen wird die nötige
   * Distanz selbst aus dem tatsächlichen, aktuellen Abstand aller sichtbaren Knoten zum Ursprung
   * berechnet (`simNodeRegistryRef`, von den Render-Callbacks laufend aktualisiert) und mit
   * `size.width/height` (unsere eigenen, garantiert aktuellen Werte) statt `camera.aspect`
   * verrechnet. Die bisherige Blickrichtung der Kamera bleibt erhalten (nur die Distanz wird
   * korrigiert), damit Auto-Rotation/manuelles Drehen nicht bei jedem Re-Fit zurückgesetzt wird. */
  useEffect(() => {
    if (!graphReady || renderMode !== '3d') return
    const fg = graphRef.current
    if (!fg) return
    const fitTimer = setTimeout(() => {
      const camera = fg.camera?.()
      if (!camera) return

      let maxExtent = 0
      for (const n of filteredNodes) {
        const sn = simNodeRegistryRef.current.get(n.id)
        if (!sn || sn.x == null || sn.y == null) continue
        const d = Math.hypot(sn.x, sn.y, sn.z ?? 0)
        if (d > maxExtent) maxExtent = d
      }
      if (maxExtent === 0) maxExtent = 980 + 300 // Fallback: Ring noch nicht positioniert

      const fov = camera.fov ?? 50
      const aspect = size.width / Math.max(size.height, 1)
      const vDist = maxExtent / Math.tan((fov * Math.PI) / 360)
      const hDist = vDist / Math.max(aspect, 0.35)
      const distance = Math.max(vDist, hDist) * 1.2

      const dir = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z)
      if (dir.lengthSq() < 1) dir.set(0.6, 0.35, 0.7)
      dir.normalize().multiplyScalar(distance)
      fg.cameraPosition({ x: dir.x, y: dir.y, z: dir.z }, { x: 0, y: 0, z: 0 }, 500)
    }, 150)
    return () => clearTimeout(fitTimer)
  }, [graphReady, renderMode, filteredNodes, size.width, size.height])

  /** 2D-Einrahmung — im bisherigen Code schlicht nicht vorhanden: ForceGraph2D startet immer bei
   * Zoom 1, zentriert auf den Ursprung, komplett unabhängig von der Canvas-Größe. Auf einem
   * 375px-Handy sah man dadurch nur einen winzigen Ausschnitt der Mitte, auf einem 2560px-Monitor
   * viel leere Fläche — und weder Resize, Orientierungswechsel noch ein Filterwechsel haben je
   * nachkorrigiert (`zoomToFit` wurde nirgends aufgerufen, und wegen `cooldownTime={Infinity}`
   * feuert `onEngineStop` auch nie).
   *
   * Bewusst wieder selbst gerechnet statt über `fg.zoomToFit()`: die Bibliotheksvariante kennt
   * die Panel-Overlays nicht und würde mittig im gesamten Canvas einrahmen — also zur Hälfte
   * hinter dem Filter-Panel. */
  useEffect(() => {
    if (!graphReady || renderMode !== '2d') return
    const fg = graphRef.current
    if (!fg) return

    const fit = () => {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const n of filteredNodes) {
        const sn = simNodeRegistryRef.current.get(n.id)
        if (!sn || sn.x == null || sn.y == null) continue
        // Kollisionsradius statt Kernradius als Bounding-Box-Rand: der schließt Glow und Label
        // mit ein, sonst werden beide am Rand angeschnitten.
        const r = radiusForType(sn.type, COLLIDE_RADIUS_2D)
        if (sn.x - r < minX) minX = sn.x - r
        if (sn.x + r > maxX) maxX = sn.x + r
        if (sn.y - r < minY) minY = sn.y - r
        if (sn.y + r > maxY) maxY = sn.y + r
      }
      if (!Number.isFinite(minX)) return // Simulation hat noch keine Positionen geliefert

      const view = usableViewport({ width: size.width, height: size.height }, viewInsetsRef.current)
      const padding = 32
      const zoom = Math.min(
        Math.max(view.width - padding * 2, 120) / Math.max(maxX - minX, 1),
        Math.max(view.height - padding * 2, 120) / Math.max(maxY - minY, 1)
      )
      const clamped = Math.min(Math.max(zoom, 0.02), 2.5)

      // `centerAt()` legt den übergebenen Weltpunkt auf die Mitte des GESAMTEN Canvas. Um
      // stattdessen in der freien Fläche zu zentrieren, wird der Zielpunkt um den in
      // Welteinheiten umgerechneten Pixel-Versatz gegengleich verschoben.
      fg.centerAt((minX + maxX) / 2 - view.offsetX / clamped, (minY + maxY) / 2, 600)
      fg.zoom(clamped, 600)
    }

    // Früher Durchlauf für sofortiges Feedback — die Ring-Knoten (und damit fast die gesamte
    // Bounding-Box) sitzen bereits ab dem ersten Tick exakt auf ihrem Platz. Die endgültige
    // Korrektur macht `onEngineStop`, sobald die Simulation wirklich steht.
    fitRef.current = fit
    const early = setTimeout(fit, 300)
    return () => {
      clearTimeout(early)
      fitRef.current = null
    }
  }, [graphReady, renderMode, filteredNodes, size.width, size.height])

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
    // Touch bleibt bei der Bibliotheks-Voreinstellung: 1 Finger dreht die Ansicht (Rotate),
    // 2 Finger zoomen (Pinch). Verschieben per Touch ist NICHT unterstützt — die tatsächlich
    // aktive Steuerung ist TrackballControls (Default 'trackball'), deren Ein-Finger-Verhalten
    // im Bibliothekscode hart auf Rotieren verdrahtet ist (kein Property dafür). Ein Wechsel auf
    // OrbitControls (`controlType="orbit"`) würde Pan zwar ermöglichen, macht aber gleichzeitig
    // die obigen, bislang folgenlosen OrbitControls-spezifischen Werte (z.B. dampingFactor=100,
    // für TrackballControls bedeutungslos) real wirksam — mit dampingFactor=100 dreht die Kamera
    // dann durch. Das müsste vor einem erneuten Versuch mit sinnvollen Werten (~0.05–0.25) neu
    // abgestimmt werden.
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

      const sourceColor = colorForNode(nodesById.get(sourceId) ?? { type: 'other' })
      const targetColor = colorForNode(nodesById.get(targetId) ?? { type: 'other' })
      const mixed = sourceColor === targetColor ? sourceColor : mixHexColors(sourceColor, targetColor)

      if (renderMode === '3d') {
        return isDimmed ? '#3a3a3a' : mixed
      }
      // 2D: dieselbe Mischfarbe wie in 3D statt des bisherigen einheitlichen Fliedertons — damit
      // ist auf einen Blick erkennbar, welche Entitätstypen eine Kante verbindet. Deckkraft
      // bewusst niedrig: die Kanten sollen die Knoten rahmen, nicht überstrahlen.
      return isDimmed ? 'rgba(255,255,255,0.05)' : hexToRgba(mixed, 0.5)
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
      // In beiden Modi die Farbe des Zielknotens — im 2D-Modus vorher ein fixer Fliederton, der
      // nicht zur (jetzt ebenfalls typgefärbten) Kante passte.
      return colorForNode(nodesById.get(targetId) ?? { type: 'other' })
    },
    [connectedToHover, renderMode, nodesById]
  )

  /** Eigenes Rendering statt nodeColor/nodeCanvasObject-Default (nur 2D-Modus): pulsierender
   * Glow + heller Kern, damit die Knoten wirken, als würden sie leuchten/kommunizieren.
   *
   * `globalScale` (der aktuelle Zoomfaktor) ist neu und der Grund, warum die Ansicht überhaupt
   * lesbar wird: Kerne und Halos bleiben in Welteinheiten (skalieren also beim Zoomen mit),
   * Konturen und Labels werden dagegen durch `globalScale` geteilt und behalten damit eine
   * konstante Größe in Bildschirm-Pixeln — sonst wären Labels beim Herauszoomen unlesbar klein
   * und beim Hineinzoomen bildschirmfüllend. */
  const nodeCanvasObject = useCallback(
    (node: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as SimNode
      simNodeRegistryRef.current.set(n.id, n)
      if (n.x == null || n.y == null) return

      const isDimmed = connectedToHover != null && !connectedToHover.has(n.id)
      const isFocused = n.id === hoveredId || n.id === selectedId
      const color = colorForNode(n)
      const baseR = radiusForType(n.type, NODE_RADIUS_2D)
      const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 850 + phaseFromId(n.id))

      if (!isDimmed) {
        // Halo enger als vorher (2.2 statt 3.2 Kernradien) und erst ab dem Kernrand beginnend:
        // mit dem alten Wert überlappten sich die Halos benachbarter Knoten großflächig und
        // ließen ganze Cluster zu einem einzigen diffusen Leuchtfleck verschmelzen.
        const glowR = baseR * (isFocused ? 3 : 2.2) * pulse
        const grd = ctx.createRadialGradient(n.x, n.y, baseR * 0.6, n.x, n.y, glowR)
        grd.addColorStop(0, hexToRgba(color, 0.4 * pulse))
        grd.addColorStop(0.55, hexToRgba(color, 0.1 * pulse))
        grd.addColorStop(1, hexToRgba(color, 0))
        ctx.fillStyle = grd
        ctx.beginPath()
        ctx.arc(n.x, n.y, glowR, 0, 2 * Math.PI)
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(n.x, n.y, baseR, 0, 2 * Math.PI)
      ctx.fillStyle = isDimmed ? 'rgba(255,255,255,0.1)' : color
      ctx.fill()
      // Dunkle Kontur: trennt den Kern sichtbar von durchlaufenden Kanten und fremden Halos,
      // sonst franst er in dichten Bereichen optisch aus.
      ctx.lineWidth = 1.5 / globalScale
      ctx.strokeStyle = isDimmed ? 'rgba(8,8,8,0.5)' : 'rgba(8,8,8,0.85)'
      ctx.stroke()

      if (!isDimmed) {
        ctx.beginPath()
        ctx.arc(n.x - baseR * 0.28, n.y - baseR * 0.28, baseR * 0.32, 0, 2 * Math.PI)
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fill()
      }

      // Auswahl-/Hover-Ring — im 2D-Modus gab es bisher gar keine sichtbare Rückmeldung darauf,
      // welcher Knoten gerade im NodePanel offen ist.
      if (isFocused) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, baseR + (5 + 2 * pulse) / Math.max(globalScale, 0.35), 0, 2 * Math.PI)
        ctx.lineWidth = 2 / globalScale
        ctx.strokeStyle = hexToRgba(color, 0.9)
        ctx.stroke()
      }

      if (isDimmed) return
      const threshold = LABEL_ZOOM_2D[n.type] ?? LABEL_ZOOM_2D.other
      if (!isFocused && globalScale < threshold) return

      const fontPx = 11 / globalScale
      ctx.font = `500 ${fontPx}px ${labelFontFamily()}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const text = truncateLabel(n.label)
      const labelY = n.y + baseR + 5 / globalScale
      // Dunkle Kontur um die Schrift statt einer Hintergrundbox: bleibt über Kanten und Halos
      // lesbar, ohne den Graphen mit undurchsichtigen Rechtecken zuzupflastern.
      ctx.lineJoin = 'round'
      ctx.lineWidth = 3 / globalScale
      ctx.strokeStyle = 'rgba(8,8,8,0.9)'
      ctx.strokeText(text, n.x, labelY)
      ctx.fillStyle = isFocused ? '#ffffff' : 'rgba(255,255,255,0.72)'
      ctx.fillText(text, n.x, labelY)
    },
    [connectedToHover, hoveredId, selectedId]
  )

  /** Trefferfläche fürs Anklicken/Hovern — großzügiger als der gezeichnete Kern, damit die
   * kleinen Knoten (Radius 8) auch mit dem Finger und beim herausgezoomten Überblick sicher
   * getroffen werden. */
  const nodePointerAreaPaint = useCallback(
    (node: unknown, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as SimNode
      if (n.x == null || n.y == null) return
      const baseR = radiusForType(n.type, NODE_RADIUS_2D)
      // Mindestens ~12 Bildschirm-Pixel Radius, egal wie weit herausgezoomt wird — aber nie über
      // den doppelten Kernradius hinaus: sonst überlappen sich beim Herauszoomen die Trefferflächen
      // benachbarter Ring-Knoten (Abstand RING_MIN_SPACING_2D) und einzelne werden unklickbar,
      // weil beim Color-Picking der zuletzt gezeichnete Knoten gewinnt.
      const hitR = Math.min(Math.max(baseR + 4, 12 / Math.max(globalScale, 0.05)), baseR * 2)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(n.x, n.y, hitR, 0, 2 * Math.PI)
      ctx.fill()
    },
    []
  )

  /** Baut pro Knoten eine Kern-Kugel + eine additive Glow-Hülle. Größe nach Entitäts-Typ (Kunden
   * am größten, Projekte kleiner, Rest am kleinsten) statt nach Grad — im 3D-Raum mit
   * Kamera-Perspektive wirken kleine Kugeln sonst wie Staubkörner. Farbe/Gruppierung bleiben
   * unverändert über `colorForNode`. */
  const nodeThreeObject = useCallback(
    (node: unknown) => {
      const n = node as SimNode
      simNodeRegistryRef.current.set(n.id, n)
      const color = colorForNode(n)
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

      // Beschriftung nur für Kunden und Projekte: das sind die Ankerpunkte, an denen man sich im
      // 3D-Raum orientiert. Alle ~800 Knoten zu beschriften würde die Szene komplett zutexten,
      // und der Name der einzelnen Leads/Dokumente steht ohnehin im Tooltip und im NodePanel.
      let labelMaterial: THREE.SpriteMaterial | undefined
      if (n.type === 'client' || n.type === 'project') {
        const sprite = makeLabelSprite(truncateLabel(n.label, 22))
        sprite.position.set(0, -(baseR * 2.2), 0)
        group.add(sprite)
        labelMaterial = sprite.material
      }

      nodeVisualsRef.current.set(n.id, { core, glow, material, glowMaterial, labelMaterial })
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

      // Label folgt der Dimmung des Knotens, damit beim Hover nicht die Namen ausgeblendeter
      // Knoten weiter über der Szene stehen bleiben.
      if (visual.labelMaterial) visual.labelMaterial.opacity = isDimmed ? 0.08 : isFocused ? 1 : 0.8
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
    <>
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

      {/* touchAction: 'none' verhindert, dass der Browser 2-Finger-Gesten (Pinch/Pan) als
          native Seiten-Zoom/Scroll abfängt statt sie an OrbitControls' Touch-Handling
          durchzureichen — ohne das funktioniert Pan/Zoom per Touch auf Mobile nicht zuverlässig. */}
      <div ref={containerRef} className="absolute inset-0" style={{ touchAction: 'none' }}>
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
            // Maßstab ist mit der neuen Link-Distanz (115 statt 70) gewachsen — dünnere Linien
            // gingen darin unter, zumal die Ansicht jetzt herausgezoomt startet.
            linkWidth={2}
            // Leichte Krümmung: bei zwei Kanten zwischen denselben Nachbarn lagen sie vorher exakt
            // übereinander, und gerade Linien durch einen dichten Cluster wirken wie ein Raster.
            linkCurvature={0.08}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={2.4}
            linkDirectionalParticleSpeed={0.004}
            linkDirectionalParticleColor={particleColor}
            // Anders als die 3D-Ansicht (cooldownTime=Infinity, sie soll bewusst dauerhaft
            // treiben) läuft die 2D-Simulation NICHT endlos weiter, sondern pendelt sich ein und
            // friert dann ein — eine ruhig stehende Karte statt einer dauernd zappelnden.
            // Gefahrlos möglich, weil die Redraw-Schleife von force-graph nicht am Simulations-
            // zustand hängt, solange Kanten Partikel tragen (`doRedraw`-Prüfung auf `__photons`);
            // `autoPauseRedraw={false}` sichert das zusätzlich für den Fall, dass gerade alle
            // Kanten ausgefiltert sind — Puls, Hover-Hervorhebung und Auswahl-Ring bleiben also
            // auch nach dem Stopp lebendig.
            cooldownTime={8000}
            autoPauseRedraw={false}
            // Schnellerer Alpha-Abfall als bisher (0.004): das Layout muss innerhalb der
            // Abkühlzeit fertig konvergiert sein, sonst friert es mitten in der Bewegung ein.
            d3AlphaDecay={0.0228}
            // Vorsimulation vor dem ersten Frame. Bewusst niedriger als in 3D (150) — jeder Tick
            // blockiert hier den Main-Thread, und die Ring-Knoten sitzen ohnehin ab Tick 1.
            warmupTicks={60}
            d3VelocityDecay={0.4}
            onEngineStop={() => fitRef.current?.()}
            onNodeClick={(node: unknown) => setSelectedNode(node as GraphNode)}
            onNodeHover={(node: unknown) => setHoveredId((node as GraphNode | null)?.id ?? null)}
          />
        )}
      </div>

      {/* Ab `lg` (1024px) bleibt das Panel permanent links offen. Bewusst NICHT schon ab `md`
          (768px) wie vorher: dort belegt es zusammen mit der 240px-Sidebar mehr als die Hälfte
          der Breite (bei 768px bleiben vom Content-Bereich 528px, davon frisst das Panel 308px)
          — auf Tablets und im Querformat blieb dadurch nur ein schmaler Streifen Graph übrig.
          Unterhalb von `lg` greift stattdessen der Toggle + das Bottom-Sheet weiter unten. */}
      <div className="hidden lg:block absolute top-5 left-5 bottom-5 z-20 pointer-events-none">
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

      {/* Mobile + Tablet: Panel startet eingeklappt (Graph bleibt voll sichtbar/bedienbar), ein
          kleiner Toggle-Button öffnet es als Bottom-Sheet statt es dauerhaft über den Bildschirm
          zu legen. Links platziert (nicht bottom-5 right-5), weil dort schon der JARVIS-Bubble
          sitzt (components/admin/JarvisWidget.tsx, z-50) — sonst überlappen sich beide Buttons. */}
      <button
        onClick={() => setMobileFiltersOpen(true)}
        className="lg:hidden absolute bottom-5 left-5 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/8 backdrop-blur-xl border border-white/12 text-white text-sm font-medium shadow-2xl shadow-black/60"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
        </svg>
        Filter
      </button>

      {mobileFiltersOpen && (
        // z-[60]: höher als JARVIS' Bubble/Chat-Fenster (z-50) — sonst schwebt der Bubble
        // sichtbar über dem geöffneten Sheet statt dahinter zu verschwinden.
        <div className="lg:hidden fixed inset-0 z-60 flex items-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileFiltersOpen(false)} />
          {/* flex + max-h (statt nur max-height auf einem reinen Block-Element) gibt dem Kind
              eine tatsächlich nutzbare Höhenbegrenzung — sonst greift `max-h-full` in
              FilterPanel nicht (Prozent-Höhen brauchen einen Vorfahren mit definierter Höhe).
              `dvh` statt `vh`: mobile Browser rechnen `vh` gegen die Viewport-Höhe OHNE
              Adressleiste/Toolbar — das Sheet ragt dadurch unten über den tatsächlich
              sichtbaren Bereich hinaus. `dvh` (dynamic viewport height) berücksichtigt die
              wirklich sichtbare Höhe inkl. Browser-Chrome. */}
          <div className="relative w-full max-h-[80dvh] flex flex-col">
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
              onClose={() => setMobileFiltersOpen(false)}
            />
          </div>
        </div>
      )}

    </div>

    {/* Außerhalb von shellClass (dessen `overflow-hidden` auf Mobile nur den Bereich UNTER der
        Topbar abdeckt, siehe shellClass' `top-14`) — NodePanel ist `fixed inset-y-0` (volle
        Bildschirmhöhe von y=0), würde also sonst am oberen Rand inkl. Schließen-Button
        abgeschnitten, weil dieser Bereich außerhalb von shellClass' eigener Box liegt. */}
    {selectedNode && (
      <NodePanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        connections={selectedConnections}
        onSelectConnection={selectNodeById}
        showLoadNeighborhood={truncated && selectedNode.type === 'lead' && !loadedNeighborhoods.has(selectedNode.id)}
        loadingNeighborhood={loadingNeighborhood}
        onLoadNeighborhood={handleLoadNeighborhood}
      />
    )}
    </>
  )
}
