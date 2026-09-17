import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { CATALOG_BY_SLUG } from '@/lib/helm/catalog/registry'
import type {
  CockpitAgentRef,
  CockpitEdge,
  CockpitNode,
  CockpitPayload,
  CockpitRunSummary,
  CockpitToolRef,
} from '@/app/(admin)/admin/helm/cockpit/types'

const RECENT_RUNS_PER_AGENT = 10

type SupabaseAdminClient = ReturnType<typeof createAdminClient>

type AgentRow = {
  id: string
  slug: string
  name: string
  role: string | null
  model: string
  system_prompt: string
  status: 'active' | 'inactive'
}

type AgentToolJoinRow = {
  agent_id: string
  tool_id: string
  agents: { id: string; slug: string; name: string } | { id: string; slug: string; name: string }[] | null
  tools: { id: string; slug: string } | { id: string; slug: string }[] | null
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}

async function fetchRecentRuns(admin: SupabaseAdminClient, agentId: string): Promise<CockpitRunSummary[]> {
  const { data, error } = await admin
    .from('agent_runs')
    .select('id, status, task, started_at, ended_at, significance')
    .eq('agent_id', agentId)
    .order('started_at', { ascending: false })
    .limit(RECENT_RUNS_PER_AGENT)

  if (error) {
    console.error('[helm/cockpit] agent_runs-Abruf fehlgeschlagen:', error)
    return []
  }

  return (data ?? []).map((run) => ({
    id: run.id,
    status: run.status,
    task: run.task,
    startedAt: run.started_at,
    endedAt: run.ended_at,
    significance: run.significance,
  }))
}

export async function GET() {
  await assertAdmin()
  const admin = createAdminClient()

  const [{ data: agents, error: agentsError }, { data: agentTools, error: agentToolsError }] = await Promise.all([
    admin.from('agents').select('id, slug, name, role, model, system_prompt, status'),
    admin.from('agent_tools').select('agent_id, tool_id, agents(id, slug, name), tools(id, slug)'),
  ])

  if (agentsError) throw new Error(agentsError.message)
  if (agentToolsError) throw new Error(agentToolsError.message)

  const agentRows = (agents ?? []) as AgentRow[]
  const orchestratorRow = agentRows.find((a) => a.slug === 'orchestrator')
  const subAgentRows = agentRows.filter((a) => a.slug !== 'orchestrator')

  // ── Tool-Zuordnungen aus agent_tools gruppieren ─────────────────────────
  // Name/Beschreibung/Bestätigungspflicht kommen nicht mehr aus der DB (public.tools
  // speichert seit Migration 0041 nur noch id/slug), sondern aus dem Code-Katalog
  // (lib/helm/catalog/registry.ts#CATALOG) — Single Source of Truth statt DB-Kopie.
  const toolsByAgentId = new Map<string, CockpitToolRef[]>()
  const agentsByToolId = new Map<string, CockpitAgentRef[]>()
  const toolById = new Map<string, CockpitToolRef & { description: string | null; isIrreversible: boolean }>()

  for (const row of (agentTools ?? []) as AgentToolJoinRow[]) {
    const agent = one(row.agents)
    const toolRow = one(row.tools)
    if (!agent || !toolRow) continue

    const catalogDef = CATALOG_BY_SLUG.get(toolRow.slug)
    const toolRef: CockpitToolRef = { id: toolRow.id, slug: toolRow.slug, name: catalogDef?.label ?? toolRow.slug }
    if (!toolsByAgentId.has(agent.id)) toolsByAgentId.set(agent.id, [])
    toolsByAgentId.get(agent.id)!.push(toolRef)

    const agentRef: CockpitAgentRef = { id: agent.id, slug: agent.slug, name: agent.name }
    if (!agentsByToolId.has(toolRow.id)) agentsByToolId.set(toolRow.id, [])
    agentsByToolId.get(toolRow.id)!.push(agentRef)

    if (!toolById.has(toolRow.id)) {
      toolById.set(toolRow.id, {
        id: toolRow.id,
        slug: toolRow.slug,
        name: catalogDef?.label ?? toolRow.slug,
        description: catalogDef?.description ?? null,
        isIrreversible: catalogDef?.requiresConfirmation ?? false,
      })
    }
  }

  // ── Knoten ───────────────────────────────────────────────────────────────
  const nodes: CockpitNode[] = []

  async function agentNode(row: AgentRow, kind: 'orchestrator' | 'agent'): Promise<CockpitNode> {
    const recentRuns = await fetchRecentRuns(admin, row.id)
    return {
      id: `agent:${row.id}`,
      kind,
      label: row.name,
      role: row.role,
      model: row.model,
      agentStatus: row.status,
      systemPrompt: row.system_prompt,
      assignedTools: toolsByAgentId.get(row.id) ?? [],
      recentRuns,
    }
  }

  const agentNodes = await Promise.all([
    ...(orchestratorRow ? [agentNode(orchestratorRow, 'orchestrator')] : []),
    ...subAgentRows.map((row) => agentNode(row, 'agent')),
  ])
  nodes.push(...agentNodes)

  for (const tool of toolById.values()) {
    nodes.push({
      id: `tool:${tool.id}`,
      kind: 'tool',
      label: tool.name,
      description: tool.description,
      isIrreversible: tool.isIrreversible,
      usedByAgents: agentsByToolId.get(tool.id) ?? [],
    })
  }

  // ── Kanten ───────────────────────────────────────────────────────────────
  const edges: CockpitEdge[] = []
  if (orchestratorRow) {
    for (const row of subAgentRows) {
      edges.push({ source: `agent:${orchestratorRow.id}`, target: `agent:${row.id}`, type: 'delegates_to' })
    }
  }
  for (const [agentId, tools] of toolsByAgentId) {
    for (const tool of tools) {
      edges.push({ source: `agent:${agentId}`, target: `tool:${tool.id}`, type: 'uses_tool' })
    }
  }

  const payload: CockpitPayload = { nodes, edges }
  return NextResponse.json(payload)
}
