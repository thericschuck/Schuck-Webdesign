import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { clientDisplayName } from '@/lib/client-name'

/** Ab wie vielen Entitäten nur noch der Kern (Kunden+Projekte) initial geladen wird. Testbar via .env.local ohne Code-Änderung. */
const TRUNCATION_THRESHOLD = Number(process.env.ADMIN_GRAPH_THRESHOLD) || 800

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
  /** true, wenn nicht alle Leads ins Budget gepasst haben — alle anderen Entitäten sind immer vollständig geladen. */
  truncated: boolean
  /** Gesamtzahl der Leads in der DB (nur gesetzt, wenn truncated). */
  totalCount?: number
}

type SupabaseAdminClient = ReturnType<typeof createAdminClient>

// ── Knoten-Builder ──────────────────────────────────────────────────────────

/** Fasst die vier Adressfelder zu einer Zeile zusammen — liefert `null`, wenn keins gesetzt ist. */
function formatClientAddress(row: {
  address_street: string | null
  address_zip: string | null
  address_city: string | null
  address_country: string | null
}): string | null {
  const cityLine = [row.address_zip, row.address_city].filter(Boolean).join(' ')
  const parts = [row.address_street, cityLine || null, row.address_country].filter(
    (part): part is string => !!part?.trim()
  )
  return parts.length > 0 ? parts.join(', ') : null
}

type ClientRow = {
  id: string
  company_name: string | null
  contact_name: string | null
  contact_email: string | null
  client_number: string | null
  status: string
  website: string | null
  phone: string | null
  address_street: string | null
  address_zip: string | null
  address_city: string | null
  address_country: string | null
  notes: string | null
  profiles: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null
}

const CLIENT_SELECT =
  'id, company_name, contact_name, contact_email, client_number, status, website, phone, address_street, address_zip, address_city, address_country, notes, profiles(full_name, email)'

function clientNode(row: ClientRow): GraphNode {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  const label = clientDisplayName(profile?.full_name, row.contact_name, row.company_name)
  const email = profile?.email ?? row.contact_email
  const address = formatClientAddress(row)

  const details: GraphNodeDetail[] = []
  // Firma nur zusätzlich zeigen, wenn sie nicht schon der angezeigte Name ist (sonst Dopplung).
  if (row.company_name && row.company_name !== label) details.push({ label: 'Firma', value: row.company_name })
  if (email) details.push({ label: 'E-Mail', value: email })
  if (row.phone) details.push({ label: 'Telefon', value: row.phone })
  if (row.website) details.push({ label: 'Website', value: row.website })
  if (address) details.push({ label: 'Adresse', value: address })
  if (row.notes) details.push({ label: 'Notiz', value: row.notes })

  return {
    id: `client:${row.id}`,
    type: 'client',
    label,
    status: row.status,
    number: row.client_number,
    url: `/admin/clients/${row.id}`,
    details: details.length > 0 ? details : undefined,
  }
}

function projectNode(row: { id: string; title: string; project_number: string | null; status: string }): GraphNode {
  return {
    id: `project:${row.id}`,
    type: 'project',
    label: row.title,
    status: row.status,
    number: row.project_number,
    url: `/admin/projects/${row.id}`,
  }
}

function documentNode(row: { id: string; name: string; category: string; project_id: string | null; client_id: string }): GraphNode {
  return {
    id: `document:${row.id}`,
    type: 'document',
    label: row.name,
    status: row.category,
    url: row.project_id ? `/admin/projects/${row.project_id}` : `/admin/clients/${row.client_id}`,
  }
}

/**
 * `status` trägt hier nicht current_stage direkt, sondern eine feinere Einteilung — Grundlage
 * für die Einfärbung nach Lead-Status in types.ts:
 * - "erstkontakt": nach akquise_ergebnis unterschieden (offen/nicht_erreicht/wiedervorlage/qualifiziert)
 * - "verloren": akquise_ergebnis='kein_interesse' bekommt eine eigene (hellere) Farbe statt im
 *   generischen "verloren" zu verschwinden — deriveStage() in akquise-sync.ts setzt current_stage
 *   für "Kein Interesse" direkt auf "verloren", ohne den Umweg über "erstkontakt".
 * - sonst current_stage direkt (quali_call/closing_call/gewonnen).
 */
function leadNode(row: {
  id: string
  firmenname: string
  lead_number: string
  current_stage: string
  akquise_ergebnis: string
}): GraphNode {
  const status =
    row.current_stage === 'erstkontakt'
      ? row.akquise_ergebnis
      : row.current_stage === 'verloren' && row.akquise_ergebnis === 'kein_interesse'
        ? 'kein_interesse'
        : row.current_stage
  return {
    id: `lead:${row.id}`,
    type: 'lead',
    label: row.firmenname,
    status,
    number: row.lead_number,
    url: `/admin/akquise/${row.id}`,
  }
}

function offerNode(row: {
  id: string
  offer_number: string
  status: string
  lead_id: string | null
  client_id: string | null
}): GraphNode {
  return {
    id: `offer:${row.id}`,
    type: 'offer',
    label: row.offer_number,
    status: row.status,
    number: row.offer_number,
    url: row.lead_id ? `/admin/akquise/${row.lead_id}` : row.client_id ? `/admin/clients/${row.client_id}` : '/admin/akquise',
  }
}

function invoiceNode(row: { id: string; invoice_number: string | null; status: string }): GraphNode {
  return {
    id: `invoice:${row.id}`,
    type: 'invoice',
    label: row.invoice_number ?? 'Entwurf',
    status: row.status,
    number: row.invoice_number,
    url: `/admin/finanzen/rechnungen/${row.id}`,
  }
}

function todoNode(row: { id: string; title: string; done: boolean; project_id: string | null }): GraphNode {
  return {
    id: `todo:${row.id}`,
    type: 'todo',
    label: row.title,
    status: row.done ? 'erledigt' : 'offen',
    url: row.project_id ? `/admin/projects/${row.project_id}` : '/admin/todos',
  }
}

function meetingNode(row: { id: string; title: string; project_id: string }): GraphNode {
  return {
    id: `meeting:${row.id}`,
    type: 'meeting',
    label: row.title,
    url: `/admin/projects/${row.project_id}`,
  }
}

function kgNode(row: { id: string; type: string; label: string; confidence: string }): GraphNode {
  return {
    id: `kg:${row.id}`,
    type: row.type,
    label: row.label,
    status: row.confidence,
    url: `/admin/wissen/${row.id}`,
  }
}

function edge(source: string, target: string, type: string, weight?: number): GraphEdge {
  return { source, target, type, weight }
}

/** Wissensknoten mit ref_table clients/projects werden auf den bestehenden Business-Knoten gemappt statt dupliziert. */
function knowledgeNodeGraphId(node: { id: string; ref_table: string | null; ref_id: string | null }): string {
  if (node.ref_table === 'clients' && node.ref_id) return `client:${node.ref_id}`
  if (node.ref_table === 'projects' && node.ref_id) return `project:${node.ref_id}`
  return `kg:${node.id}`
}

// ── Vollständiger Graph ───────────────────────────────────────────────────

/**
 * Alle Entitäten außer Leads werden immer vollständig geladen — davon gibt es nie genug, um an
 * TRUNCATION_THRESHOLD heranzukommen. Nur Leads (aktuell >600) werden auf das verbleibende Budget
 * begrenzt, sortiert nach zuletzt bearbeitet, damit die relevantesten zuerst erscheinen.
 */
async function fetchGraph(admin: SupabaseAdminClient): Promise<GraphPayload> {
  const [
    { data: clients },
    { data: projects },
    { data: documents },
    { data: offers },
    { data: invoices },
    { data: todos },
    { data: meetings },
    { data: kgNodes },
    { data: kgEdges },
    { count: totalLeads },
  ] = await Promise.all([
    admin.from('clients').select(CLIENT_SELECT),
    admin.from('projects').select('id, title, project_number, status, client_id'),
    admin.from('documents').select('id, name, category, project_id, client_id'),
    admin.from('offers').select('id, offer_number, status, lead_id, client_id'),
    admin.from('invoices').select('id, invoice_number, status, client_id, project_id'),
    admin.from('todos').select('id, title, done, project_id, meeting_id').or('project_id.not.is.null,meeting_id.not.is.null'),
    admin.from('meetings').select('id, title, project_id'),
    admin.from('nodes').select('id, type, label, confidence, ref_table, ref_id'),
    admin.from('edges').select('from_id, to_id, type, weight'),
    admin.from('leads').select('id', { count: 'exact', head: true }),
  ])

  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const nodeIds = new Set<string>()
  const addNode = (n: GraphNode) => {
    if (!nodeIds.has(n.id)) {
      nodeIds.add(n.id)
      nodes.push(n)
    }
  }

  for (const c of clients ?? []) addNode(clientNode(c))
  for (const p of projects ?? []) {
    addNode(projectNode(p))
    edges.push(edge(`client:${p.client_id}`, `project:${p.id}`, 'has_project'))
  }
  for (const d of documents ?? []) {
    addNode(documentNode(d))
    edges.push(edge(d.project_id ? `project:${d.project_id}` : `client:${d.client_id}`, `document:${d.id}`, 'has_document'))
  }
  for (const o of offers ?? []) {
    addNode(offerNode(o))
    if (o.lead_id) edges.push(edge(`lead:${o.lead_id}`, `offer:${o.id}`, 'has_offer'))
    else if (o.client_id) edges.push(edge(`client:${o.client_id}`, `offer:${o.id}`, 'has_offer'))
  }
  for (const i of invoices ?? []) {
    addNode(invoiceNode(i))
    edges.push(edge(`client:${i.client_id}`, `invoice:${i.id}`, 'has_invoice'))
    if (i.project_id) edges.push(edge(`project:${i.project_id}`, `invoice:${i.id}`, 'has_invoice'))
  }
  for (const t of todos ?? []) {
    addNode(todoNode(t))
    if (t.meeting_id) edges.push(edge(`meeting:${t.meeting_id}`, `todo:${t.id}`, 'has_todo'))
    else if (t.project_id) edges.push(edge(`project:${t.project_id}`, `todo:${t.id}`, 'has_todo'))
  }
  for (const m of meetings ?? []) {
    addNode(meetingNode(m))
    edges.push(edge(`project:${m.project_id}`, `meeting:${m.id}`, 'has_meeting'))
  }

  const kgIdMap = new Map<string, string>()
  for (const n of kgNodes ?? []) {
    const graphId = knowledgeNodeGraphId(n)
    kgIdMap.set(n.id, graphId)
    if (graphId.startsWith('kg:')) addNode(kgNode(n))
  }
  for (const e of kgEdges ?? []) {
    const source = kgIdMap.get(e.from_id)
    const target = kgIdMap.get(e.to_id)
    if (source && target && nodeIds.has(source) && nodeIds.has(target)) {
      edges.push(edge(source, target, e.type, e.weight))
    }
  }

  const leadBudget = Math.max(0, TRUNCATION_THRESHOLD - nodes.length)
  const { data: leads } =
    leadBudget > 0
      ? await admin
          .from('leads')
          .select('id, firmenname, lead_number, current_stage, akquise_ergebnis, client_id')
          .order('updated_at', { ascending: false })
          .limit(leadBudget)
      : { data: [] }

  for (const l of leads ?? []) {
    addNode(leadNode(l))
    if (l.client_id) edges.push(edge(`lead:${l.id}`, `client:${l.client_id}`, 'converted_to'))
  }

  const validEdges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
  const truncated = (totalLeads ?? 0) > (leads?.length ?? 0)

  return { nodes, edges: validEdges, truncated, totalCount: truncated ? (totalLeads ?? 0) : undefined }
}

const getCachedGraph = unstable_cache(
  async (): Promise<GraphPayload> => {
    const admin = createAdminClient()
    return fetchGraph(admin)
  },
  ['admin-graph'],
  { revalidate: 60, tags: ['admin-graph'] }
)

// ── 1-Hop-Nachbarschaft für einen einzelnen Knoten (truncated-Modus) ────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NEIGHBORHOOD_TYPES = ['client', 'project', 'kg', 'lead'] as const

async function fetchNeighborhood(admin: SupabaseAdminClient, graphId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const separatorIndex = graphId.indexOf(':')
  const type = graphId.slice(0, separatorIndex)
  const id = graphId.slice(separatorIndex + 1)

  // id landet roh in .or()-Filterstrings weiter unten — vor jeder Query auf UUID-Form validieren.
  if (!UUID_RE.test(id) || !NEIGHBORHOOD_TYPES.includes(type as (typeof NEIGHBORHOOD_TYPES)[number])) {
    return { nodes: [], edges: [] }
  }

  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const nodeIds = new Set<string>()
  const addNode = (n: GraphNode) => {
    if (!nodeIds.has(n.id)) {
      nodeIds.add(n.id)
      nodes.push(n)
    }
  }

  async function addKnowledgeNeighbors(refTable: 'clients' | 'projects', refId: string) {
    const { data: selfNode } = await admin.from('nodes').select('id').eq('ref_table', refTable).eq('ref_id', refId).maybeSingle()
    if (!selfNode) return
    const selfGraphId = `${refTable === 'clients' ? 'client' : 'project'}:${refId}`
    const { data: connectedEdges } = await admin.from('edges').select('from_id, to_id, type, weight').or(`from_id.eq.${selfNode.id},to_id.eq.${selfNode.id}`)
    const otherNodeIds = new Set<string>()
    for (const e of connectedEdges ?? []) {
      otherNodeIds.add(e.from_id === selfNode.id ? e.to_id : e.from_id)
    }
    if (otherNodeIds.size === 0) return
    const { data: otherNodes } = await admin.from('nodes').select('id, type, label, confidence, ref_table, ref_id').in('id', [...otherNodeIds])
    const idMap = new Map<string, string>([[selfNode.id, selfGraphId]])
    for (const n of otherNodes ?? []) {
      const gid = knowledgeNodeGraphId(n)
      idMap.set(n.id, gid)
      if (gid.startsWith('kg:')) addNode(kgNode(n))
    }
    for (const e of connectedEdges ?? []) {
      const source = idMap.get(e.from_id)
      const target = idMap.get(e.to_id)
      if (source && target) edges.push(edge(source, target, e.type, e.weight))
    }
  }

  if (type === 'client') {
    const { data: client } = await admin.from('clients').select(CLIENT_SELECT).eq('id', id).maybeSingle()
    if (!client) return { nodes, edges }
    addNode(clientNode(client))

    const [{ data: projects }, { data: invoices }, { data: offers }, { data: leads }, { data: documents }] = await Promise.all([
      admin.from('projects').select('id, title, project_number, status, client_id').eq('client_id', id),
      admin.from('invoices').select('id, invoice_number, status, client_id, project_id').eq('client_id', id),
      admin.from('offers').select('id, offer_number, status, lead_id, client_id').eq('client_id', id),
      admin.from('leads').select('id, firmenname, lead_number, current_stage, akquise_ergebnis, client_id').eq('client_id', id),
      admin.from('documents').select('id, name, category, project_id, client_id').eq('client_id', id).is('project_id', null),
    ])
    for (const p of projects ?? []) {
      addNode(projectNode(p))
      edges.push(edge(`client:${id}`, `project:${p.id}`, 'has_project'))
    }
    for (const i of invoices ?? []) {
      addNode(invoiceNode(i))
      edges.push(edge(`client:${id}`, `invoice:${i.id}`, 'has_invoice'))
    }
    for (const o of offers ?? []) {
      addNode(offerNode(o))
      edges.push(edge(`client:${id}`, `offer:${o.id}`, 'has_offer'))
    }
    for (const l of leads ?? []) {
      addNode(leadNode(l))
      edges.push(edge(`lead:${l.id}`, `client:${id}`, 'converted_to'))
    }
    for (const d of documents ?? []) {
      addNode(documentNode(d))
      edges.push(edge(`client:${id}`, `document:${d.id}`, 'has_document'))
    }
    await addKnowledgeNeighbors('clients', id)
  } else if (type === 'project') {
    const { data: project } = await admin.from('projects').select('id, title, project_number, status, client_id').eq('id', id).maybeSingle()
    if (!project) return { nodes, edges }
    addNode(projectNode(project))

    const { data: client } = await admin.from('clients').select(CLIENT_SELECT).eq('id', project.client_id).maybeSingle()
    if (client) {
      addNode(clientNode(client))
      edges.push(edge(`client:${project.client_id}`, `project:${id}`, 'has_project'))
    }

    const [{ data: documents }, { data: todos }, { data: meetings }, { data: invoices }] = await Promise.all([
      admin.from('documents').select('id, name, category, project_id, client_id').eq('project_id', id),
      admin.from('todos').select('id, title, done, project_id, meeting_id').eq('project_id', id),
      admin.from('meetings').select('id, title, project_id').eq('project_id', id),
      admin.from('invoices').select('id, invoice_number, status, client_id, project_id').eq('project_id', id),
    ])
    for (const d of documents ?? []) {
      addNode(documentNode(d))
      edges.push(edge(`project:${id}`, `document:${d.id}`, 'has_document'))
    }
    for (const t of todos ?? []) {
      addNode(todoNode(t))
      if (!t.meeting_id) edges.push(edge(`project:${id}`, `todo:${t.id}`, 'has_todo'))
    }
    for (const m of meetings ?? []) {
      addNode(meetingNode(m))
      edges.push(edge(`project:${id}`, `meeting:${m.id}`, 'has_meeting'))
      const meetingTodos = (todos ?? []).filter((t) => t.meeting_id === m.id)
      for (const t of meetingTodos) edges.push(edge(`meeting:${m.id}`, `todo:${t.id}`, 'has_todo'))
    }
    for (const i of invoices ?? []) {
      addNode(invoiceNode(i))
      edges.push(edge(`project:${id}`, `invoice:${i.id}`, 'has_invoice'))
    }
    await addKnowledgeNeighbors('projects', id)
  } else if (type === 'lead') {
    const { data: lead } = await admin
      .from('leads')
      .select('id, firmenname, lead_number, current_stage, akquise_ergebnis, client_id')
      .eq('id', id)
      .maybeSingle()
    if (!lead) return { nodes, edges }
    addNode(leadNode(lead))

    if (lead.client_id) {
      const { data: client } = await admin.from('clients').select(CLIENT_SELECT).eq('id', lead.client_id).maybeSingle()
      if (client) {
        addNode(clientNode(client))
        edges.push(edge(`lead:${id}`, `client:${lead.client_id}`, 'converted_to'))
      }
    }

    const { data: offers } = await admin
      .from('offers')
      .select('id, offer_number, status, lead_id, client_id')
      .eq('lead_id', id)
    for (const o of offers ?? []) {
      addNode(offerNode(o))
      edges.push(edge(`lead:${id}`, `offer:${o.id}`, 'has_offer'))
    }
  } else if (type === 'kg') {
    const { data: node } = await admin.from('nodes').select('id, type, label, confidence, ref_table, ref_id').eq('id', id).maybeSingle()
    if (!node) return { nodes, edges }
    addNode(kgNode(node))

    const { data: connectedEdges } = await admin.from('edges').select('from_id, to_id, type, weight').or(`from_id.eq.${id},to_id.eq.${id}`)
    const otherIds = new Set<string>()
    for (const e of connectedEdges ?? []) otherIds.add(e.from_id === id ? e.to_id : e.from_id)
    if (otherIds.size > 0) {
      const { data: others } = await admin.from('nodes').select('id, type, label, confidence, ref_table, ref_id').in('id', [...otherIds])
      const idMap = new Map<string, string>([[id, `kg:${id}`]])
      for (const n of others ?? []) idMap.set(n.id, knowledgeNodeGraphId(n))

      for (const n of others ?? []) {
        const gid = knowledgeNodeGraphId(n)
        if (gid.startsWith('kg:')) {
          addNode(kgNode(n))
        } else if (gid.startsWith('client:')) {
          const { data: c } = await admin.from('clients').select(CLIENT_SELECT).eq('id', n.ref_id!).maybeSingle()
          if (c) addNode(clientNode(c))
        } else if (gid.startsWith('project:')) {
          const { data: p } = await admin.from('projects').select('id, title, project_number, status, client_id').eq('id', n.ref_id!).maybeSingle()
          if (p) addNode(projectNode(p))
        }
      }
      for (const e of connectedEdges ?? []) {
        const source = idMap.get(e.from_id)
        const target = idMap.get(e.to_id)
        if (source && target) edges.push(edge(source, target, e.type, e.weight))
      }
    }
  }

  return { nodes, edges: edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target)) }
}

// ── Route ────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  await assertAdmin()

  const expand = request.nextUrl.searchParams.get('expand')
  if (expand) {
    const admin = createAdminClient()
    const result = await fetchNeighborhood(admin, expand)
    return NextResponse.json(result)
  }

  const payload = await getCachedGraph()
  return NextResponse.json(payload)
}
