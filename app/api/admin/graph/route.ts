import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { clientDisplayName } from '@/lib/client-name'

/** Ab wie vielen Entitäten nur noch der Kern (Kunden+Projekte) initial geladen wird. Testbar via .env.local ohne Code-Änderung. */
const TRUNCATION_THRESHOLD = Number(process.env.ADMIN_GRAPH_THRESHOLD) || 500

export interface GraphNode {
  id: string
  type: string
  label: string
  status?: string | null
  number?: string | null
  url: string
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
  truncated: boolean
  totalCount?: number
}

type SupabaseAdminClient = ReturnType<typeof createAdminClient>

// ── Knoten-Builder ──────────────────────────────────────────────────────────

function clientNode(row: {
  id: string
  company_name: string | null
  contact_name: string | null
  client_number: string | null
  status: string
  profiles: { full_name: string | null } | { full_name: string | null }[] | null
}): GraphNode {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return {
    id: `client:${row.id}`,
    type: 'client',
    label: clientDisplayName(profile?.full_name, row.contact_name, row.company_name),
    status: row.status,
    number: row.client_number,
    url: `/admin/clients/${row.id}`,
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

function leadNode(row: { id: string; firmenname: string; lead_number: string; current_stage: string }): GraphNode {
  return {
    id: `lead:${row.id}`,
    type: 'lead',
    label: row.firmenname,
    status: row.current_stage,
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

async function fetchFullGraph(admin: SupabaseAdminClient): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const [
    { data: clients },
    { data: projects },
    { data: documents },
    { data: leads },
    { data: offers },
    { data: invoices },
    { data: todos },
    { data: meetings },
    { data: kgNodes },
    { data: kgEdges },
  ] = await Promise.all([
    admin.from('clients').select('id, company_name, contact_name, client_number, status, profiles(full_name)'),
    admin.from('projects').select('id, title, project_number, status, client_id'),
    admin.from('documents').select('id, name, category, project_id, client_id'),
    admin.from('leads').select('id, firmenname, lead_number, current_stage, client_id'),
    admin.from('offers').select('id, offer_number, status, lead_id, client_id'),
    admin.from('invoices').select('id, invoice_number, status, client_id, project_id'),
    admin.from('todos').select('id, title, done, project_id, meeting_id').or('project_id.not.is.null,meeting_id.not.is.null'),
    admin.from('meetings').select('id, title, project_id'),
    admin.from('nodes').select('id, type, label, confidence, ref_table, ref_id'),
    admin.from('edges').select('from_id, to_id, type, weight'),
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
  for (const l of leads ?? []) {
    addNode(leadNode(l))
    if (l.client_id) edges.push(edge(`lead:${l.id}`, `client:${l.client_id}`, 'converted_to'))
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

  const validEdges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))

  return { nodes, edges: validEdges }
}

async function fetchCoreGraph(admin: SupabaseAdminClient): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const [{ data: clients }, { data: projects }] = await Promise.all([
    admin.from('clients').select('id, company_name, contact_name, client_number, status, profiles(full_name)'),
    admin.from('projects').select('id, title, project_number, status, client_id'),
  ])

  const nodes: GraphNode[] = (clients ?? []).map(clientNode)
  const clientIds = new Set(nodes.map((n) => n.id))
  const edges: GraphEdge[] = []
  for (const p of projects ?? []) {
    nodes.push(projectNode(p))
    const source = `client:${p.client_id}`
    if (clientIds.has(source)) edges.push(edge(source, `project:${p.id}`, 'has_project'))
  }

  return { nodes, edges }
}

async function countEligible(admin: SupabaseAdminClient): Promise<number> {
  const [clients, projects, documents, leads, offers, invoices, meetings, allTodos, orphanTodos, allNodes, mappedNodes] =
    await Promise.all([
      admin.from('clients').select('id', { count: 'exact', head: true }),
      admin.from('projects').select('id', { count: 'exact', head: true }),
      admin.from('documents').select('id', { count: 'exact', head: true }),
      admin.from('leads').select('id', { count: 'exact', head: true }),
      admin.from('offers').select('id', { count: 'exact', head: true }),
      admin.from('invoices').select('id', { count: 'exact', head: true }),
      admin.from('meetings').select('id', { count: 'exact', head: true }),
      admin.from('todos').select('id', { count: 'exact', head: true }),
      admin.from('todos').select('id', { count: 'exact', head: true }).is('project_id', null).is('meeting_id', null),
      admin.from('nodes').select('id', { count: 'exact', head: true }),
      admin.from('nodes').select('id', { count: 'exact', head: true }).in('ref_table', ['clients', 'projects']),
    ])

  const eligibleTodos = (allTodos.count ?? 0) - (orphanTodos.count ?? 0)
  const standaloneKgNodes = (allNodes.count ?? 0) - (mappedNodes.count ?? 0)

  return (
    (clients.count ?? 0) +
    (projects.count ?? 0) +
    (documents.count ?? 0) +
    (leads.count ?? 0) +
    (offers.count ?? 0) +
    (invoices.count ?? 0) +
    (meetings.count ?? 0) +
    eligibleTodos +
    standaloneKgNodes
  )
}

const getCachedGraph = unstable_cache(
  async (): Promise<GraphPayload> => {
    const admin = createAdminClient()
    const totalCount = await countEligible(admin)

    if (totalCount >= TRUNCATION_THRESHOLD) {
      const { nodes, edges } = await fetchCoreGraph(admin)
      return { nodes, edges, truncated: true, totalCount }
    }

    const { nodes, edges } = await fetchFullGraph(admin)
    return { nodes, edges, truncated: false }
  },
  ['admin-graph'],
  { revalidate: 60, tags: ['admin-graph'] }
)

// ── 1-Hop-Nachbarschaft für einen einzelnen Knoten (truncated-Modus) ────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NEIGHBORHOOD_TYPES = ['client', 'project', 'kg'] as const

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
    const { data: client } = await admin.from('clients').select('id, company_name, contact_name, client_number, status, profiles(full_name)').eq('id', id).maybeSingle()
    if (!client) return { nodes, edges }
    addNode(clientNode(client))

    const [{ data: projects }, { data: invoices }, { data: offers }, { data: leads }, { data: documents }] = await Promise.all([
      admin.from('projects').select('id, title, project_number, status, client_id').eq('client_id', id),
      admin.from('invoices').select('id, invoice_number, status, client_id, project_id').eq('client_id', id),
      admin.from('offers').select('id, offer_number, status, lead_id, client_id').eq('client_id', id),
      admin.from('leads').select('id, firmenname, lead_number, current_stage, client_id').eq('client_id', id),
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

    const { data: client } = await admin.from('clients').select('id, company_name, contact_name, client_number, status, profiles(full_name)').eq('id', project.client_id).maybeSingle()
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
          const { data: c } = await admin.from('clients').select('id, company_name, contact_name, client_number, status, profiles(full_name)').eq('id', n.ref_id!).maybeSingle()
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
