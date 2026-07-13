import { createAdminClient } from '@/lib/supabase/admin'
import { DomainError } from './errors'
import { embedText } from '@/lib/jarvis/embeddings'
import type { Database, KnowledgeNode, KnowledgeEdge, NodeType, NodeSource, NodeConfidence, EdgeType } from '@/types/database'

type NodeUpdate = Database['public']['Tables']['nodes']['Update']

export const NODE_TYPES: NodeType[] = [
  'client',
  'project',
  'contact',
  'fact',
  'preference',
  'note',
  'process',
  'product',
  'session',
]
export const NODE_SOURCE_VALUES: NodeSource[] = ['jarvis_auto', 'user_explicit', 'imported']
export const NODE_CONFIDENCE_VALUES: NodeConfidence[] = ['high', 'medium', 'low', 'deprecated']
export const EDGE_TYPES: EdgeType[] = [
  'has_project',
  'has_contact',
  'mentioned_in',
  'contradicts',
  'confirms',
  'relates_to',
  'learned_from',
  'part_of_session',
]

/** Grobe Schätzung 4 Zeichen/Token — genug Präzision für einen weichen Kontext-Budget-Deckel. */
const CONTEXT_CHAR_BUDGET = 8000
const TRAVERSAL_DEPTH = 3
const TRAVERSAL_MAX_NODES = 100
const SEMANTIC_TOP_K = 20

// ── list/get ─────────────────────────────────────────────────────────────

export interface ListNodesFilter {
  type?: NodeType
  confidence?: NodeConfidence
  source?: NodeSource
  search?: string
}

export async function listNodes(filter: ListNodesFilter = {}): Promise<KnowledgeNode[]> {
  const adminClient = createAdminClient()
  let query = adminClient.from('nodes').select('*').order('created_at', { ascending: false })

  if (filter.type) query = query.eq('type', filter.type)
  if (filter.confidence) query = query.eq('confidence', filter.confidence)
  if (filter.source) query = query.eq('source', filter.source)
  if (filter.search) {
    const term = filter.search.replace(/[%,]/g, '')
    query = query.or(`label.ilike.%${term}%,body.ilike.%${term}%`)
  }

  const { data, error } = await query
  if (error) throw new DomainError(error.message)
  return data
}

export interface NodeDetail extends KnowledgeNode {
  outgoing: (KnowledgeEdge & { to: { id: string; label: string; type: NodeType } | null })[]
  incoming: (KnowledgeEdge & { from: { id: string; label: string; type: NodeType } | null })[]
}

export async function getNode(nodeId: string): Promise<NodeDetail> {
  const adminClient = createAdminClient()

  const [{ data: node, error: nodeError }, { data: outgoing, error: outError }, { data: incoming, error: inError }] =
    await Promise.all([
      adminClient.from('nodes').select('*').eq('id', nodeId).single(),
      adminClient
        .from('edges')
        .select('*, to:nodes!edges_to_id_fkey(id, label, type)')
        .eq('from_id', nodeId)
        .order('created_at', { ascending: false }),
      adminClient
        .from('edges')
        .select('*, from:nodes!edges_from_id_fkey(id, label, type)')
        .eq('to_id', nodeId)
        .order('created_at', { ascending: false }),
    ])

  if (nodeError) throw new DomainError('Knoten nicht gefunden.')
  if (outError) throw new DomainError(outError.message)
  if (inError) throw new DomainError(inError.message)

  return {
    ...node,
    outgoing: (outgoing ?? []).map(({ to, ...edge }) => ({ ...edge, to: Array.isArray(to) ? (to[0] ?? null) : to })),
    incoming: (incoming ?? []).map(({ from, ...edge }) => ({ ...edge, from: Array.isArray(from) ? (from[0] ?? null) : from })),
  }
}

// ── write ────────────────────────────────────────────────────────────────

export interface AddNodeInput {
  type: NodeType
  label: string
  body?: string | null
  refId?: string | null
  refTable?: string | null
  source?: NodeSource
}

export async function addNode(input: AddNodeInput): Promise<KnowledgeNode> {
  const label = input.label.trim()
  if (!label) throw new DomainError('Label ist erforderlich.')
  if (!NODE_TYPES.includes(input.type)) throw new DomainError(`Ungültiger Typ "${input.type}".`)

  let embedding: number[] | null = null
  try {
    embedding = await embedText(`${label}\n${input.body ?? ''}`.trim())
  } catch (error) {
    console.error(
      '[knowledge] Embedding fehlgeschlagen, Knoten wird ohne Embedding gespeichert:',
      error instanceof Error ? error.message : error
    )
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('nodes')
    .insert({
      type: input.type,
      label,
      body: input.body ?? null,
      ref_id: input.refId ?? null,
      ref_table: input.refTable ?? null,
      source: input.source ?? 'jarvis_auto',
      embedding,
    })
    .select('*')
    .single()

  if (error) throw new DomainError(`Knoten konnte nicht gespeichert werden: ${error.message}`)
  return data
}

export interface UpdateNodeInput {
  label?: string
  body?: string | null
  confidence?: NodeConfidence
}

/** Re-embedded automatisch, wenn label oder body sich ändern. */
export async function updateNode(nodeId: string, patch: UpdateNodeInput): Promise<KnowledgeNode> {
  const updates: Record<string, unknown> = {}
  if (patch.label !== undefined) {
    if (!patch.label.trim()) throw new DomainError('Label darf nicht leer sein.')
    updates.label = patch.label.trim()
  }
  if (patch.body !== undefined) updates.body = patch.body
  if (patch.confidence !== undefined) {
    if (!NODE_CONFIDENCE_VALUES.includes(patch.confidence)) {
      throw new DomainError(`Ungültige confidence "${patch.confidence}".`)
    }
    updates.confidence = patch.confidence
  }
  if (Object.keys(updates).length === 0) throw new DomainError('Keine Felder zum Aktualisieren angegeben.')

  const adminClient = createAdminClient()

  if (updates.label !== undefined || updates.body !== undefined) {
    const { data: existing, error: existingError } = await adminClient
      .from('nodes')
      .select('label, body')
      .eq('id', nodeId)
      .single()
    if (existingError) throw new DomainError('Knoten nicht gefunden.')

    const newLabel = (updates.label as string | undefined) ?? existing.label
    const newBody = updates.body !== undefined ? (updates.body as string | null) : existing.body
    try {
      updates.embedding = await embedText(`${newLabel}\n${newBody ?? ''}`.trim())
    } catch (error) {
      console.error('[knowledge] Re-Embedding fehlgeschlagen:', error instanceof Error ? error.message : error)
    }
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await adminClient.from('nodes').update(updates as NodeUpdate).eq('id', nodeId).select('*').single()
  if (error) throw new DomainError(error.message)
  return data
}

/** Nie Hard-Delete — veraltete Knoten werden auf confidence: deprecated gesetzt, Historie bleibt erhalten. */
export async function deprecateNode(nodeId: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('nodes')
    .update({ confidence: 'deprecated', updated_at: new Date().toISOString() })
    .eq('id', nodeId)
  if (error) throw new DomainError(error.message)
}

/** Nutzt die atomare RPC link_nodes — erneutes Verlinken desselben Paars/Typs erhöht weight statt zu duplizieren. */
export async function linkNodes(fromId: string, toId: string, type: EdgeType, weight = 1.0): Promise<KnowledgeEdge> {
  if (!EDGE_TYPES.includes(type)) throw new DomainError(`Ungültiger Kantentyp "${type}".`)

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.rpc('link_nodes', { p_from: fromId, p_to: toId, p_type: type, p_weight: weight })
  if (error) throw new DomainError(error.message)
  return data
}

// ── search / context ─────────────────────────────────────────────────────

export async function semanticSearch(query: string, k: number = SEMANTIC_TOP_K): Promise<KnowledgeNode[]> {
  const trimmed = query.trim()
  if (!trimmed) throw new DomainError('query ist erforderlich.')

  const embedding = await embedText(trimmed)
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.rpc('match_nodes', { query_embedding: embedding, match_count: k })
  if (error) throw new DomainError(error.message)
  return data ?? []
}

export interface ClientContextInput {
  /** Freitext (typischerweise der letzte User-Prompt) — treibt Semantic Search als Seed. */
  query?: string
  /** clients.id — seedet stattdessen direkt am Kunden-Knoten (ref_table='clients'). */
  clientId?: string
}

export interface ClientContextResult {
  contextBlock: string
  nodeIds: string[]
}

/**
 * Gemeinsame Kontext-Pipeline für den Per-Prompt-Hook (lib/jarvis/context.ts, Seed = query)
 * und das Tool get_client_context (Seed = clientId): Semantic Search bzw. Kunden-Knoten
 * → Graph-Traversal Tiefe 3 → Dedupe → deprecated ausgeschlossen → ~2.000-Token-Textblock.
 */
export async function getClientContext(input: ClientContextInput): Promise<ClientContextResult> {
  const adminClient = createAdminClient()

  let seedNodes: KnowledgeNode[] = []
  if (input.clientId) {
    const { data, error } = await adminClient
      .from('nodes')
      .select('*')
      .eq('ref_table', 'clients')
      .eq('ref_id', input.clientId)
      .neq('confidence', 'deprecated')
    if (error) throw new DomainError(error.message)
    seedNodes = data ?? []
  } else if (input.query) {
    seedNodes = await semanticSearch(input.query, SEMANTIC_TOP_K)
  }

  if (seedNodes.length === 0) return { contextBlock: '', nodeIds: [] }

  const visited = new Map<string, KnowledgeNode>()
  for (const n of seedNodes) visited.set(n.id, n)
  let frontier = seedNodes.map((n) => n.id)

  for (let depth = 0; depth < TRAVERSAL_DEPTH && frontier.length > 0 && visited.size < TRAVERSAL_MAX_NODES; depth++) {
    const idList = frontier.join(',')
    const { data: edges, error: edgesError } = await adminClient
      .from('edges')
      .select('from_id, to_id')
      .or(`from_id.in.(${idList}),to_id.in.(${idList})`)
      .order('weight', { ascending: false })
    if (edgesError) throw new DomainError(edgesError.message)

    const nextIds = new Set<string>()
    for (const e of edges ?? []) {
      if (!visited.has(e.to_id)) nextIds.add(e.to_id)
      if (!visited.has(e.from_id)) nextIds.add(e.from_id)
    }
    if (nextIds.size === 0) break

    const { data: nextNodes, error: nodesError } = await adminClient
      .from('nodes')
      .select('*')
      .in('id', [...nextIds])
      .neq('confidence', 'deprecated')
    if (nodesError) throw new DomainError(nodesError.message)

    for (const n of nextNodes ?? []) visited.set(n.id, n)
    frontier = (nextNodes ?? []).map((n) => n.id)
  }

  const nodes = [...visited.values()]
  return { contextBlock: formatContextBlock(nodes), nodeIds: nodes.map((n) => n.id) }
}

function formatContextBlock(nodes: KnowledgeNode[]): string {
  const byType = new Map<NodeType, KnowledgeNode[]>()
  for (const n of nodes) {
    const list = byType.get(n.type) ?? []
    list.push(n)
    byType.set(n.type, list)
  }

  let block = ''
  for (const [type, list] of byType) {
    const heading = `\n### ${type}\n`
    if (block.length + heading.length > CONTEXT_CHAR_BUDGET) break
    block += heading
    for (const n of list) {
      const line = `- ${n.label}${n.body ? `: ${n.body}` : ''}\n`
      if (block.length + line.length > CONTEXT_CHAR_BUDGET) break
      block += line
    }
  }
  return block.trim()
}

// ── session logs ─────────────────────────────────────────────────────────

export interface ListSessionLogsFilter {
  nodeId?: string
  fromDate?: string
  toDate?: string
}

export async function listSessionLogs(filter: ListSessionLogsFilter = {}) {
  const adminClient = createAdminClient()
  let query = adminClient.from('conversation_logs').select('*, nodes(label)').order('created_at', { ascending: false })

  if (filter.nodeId) query = query.eq('node_id', filter.nodeId)
  if (filter.fromDate) query = query.gte('created_at', filter.fromDate)
  if (filter.toDate) query = query.lte('created_at', filter.toDate)

  const { data, error } = await query
  if (error) throw new DomainError(error.message)

  return (data ?? []).map(({ nodes, ...log }) => ({
    ...log,
    node_label: (Array.isArray(nodes) ? nodes[0] : nodes)?.label ?? null,
  }))
}

export interface WriteSessionLogInput {
  title: string
  summary: string
  clientIds?: string[]
  projectIds?: string[]
}

/**
 * Legt einen session-Knoten + conversation_logs-Zeile an und verlinkt (part_of_session)
 * zu den Client-/Projekt-Knoten der übergebenen IDs, sofern vorhanden. `messages` bleibt
 * leer — Tools bekommen keinen Zugriff auf die rohe Conversation (nur `args`), das Modell
 * liefert stattdessen einen selbst verfassten summary-Text. Das Label ist ein inhaltlicher,
 * von JARVIS verfasster Titel statt nur des Datums — sonst heißen mehrere Sessions am
 * selben Tag alle identisch ("Gespräch DD.MM.YYYY") und sind in der Liste (die das Datum
 * ohnehin separat anzeigt) nicht mehr auf einen Blick unterscheidbar.
 */
export async function writeSessionLog(input: WriteSessionLogInput): Promise<{ nodeId: string }> {
  const summary = input.summary.trim()
  if (!summary) throw new DomainError('summary ist erforderlich.')
  const title = input.title.trim() || `Gespräch ${new Date().toLocaleDateString('de-DE')}`

  const sessionNode = await addNode({
    type: 'session',
    label: title,
    body: summary,
    source: 'jarvis_auto',
  })

  const adminClient = createAdminClient()
  const refPairs = [
    ...(input.clientIds ?? []).map((refId) => ({ refTable: 'clients', refId })),
    ...(input.projectIds ?? []).map((refId) => ({ refTable: 'projects', refId })),
  ]

  for (const { refTable, refId } of refPairs) {
    const { data: targetNode } = await adminClient
      .from('nodes')
      .select('id')
      .eq('ref_table', refTable)
      .eq('ref_id', refId)
      .maybeSingle()
    if (targetNode) {
      await linkNodes(sessionNode.id, targetNode.id, 'part_of_session')
    }
  }

  const { error } = await adminClient.from('conversation_logs').insert({ node_id: sessionNode.id, messages: [], summary })
  if (error) {
    throw new DomainError(`Session-Knoten angelegt, aber Log konnte nicht gespeichert werden: ${error.message}`)
  }

  return { nodeId: sessionNode.id }
}
