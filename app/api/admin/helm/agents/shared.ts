import { createAdminClient } from '@/lib/supabase/admin'
import { CATALOG_BY_SLUG } from '@/lib/helm/catalog/registry'
import type { AgentDetailResponse, CockpitToolRef } from '@/app/(admin)/admin/helm/cockpit/types'

type SupabaseAdminClient = ReturnType<typeof createAdminClient>

/** Gemeinsam von GET/PATCH (agents/[id]) und PUT (agents/[id]/tools) genutzt, damit beide
 * Routen exakt dieselbe, vollständige Antwortform liefern — der Client merged davon direkt
 * ins Node-Panel statt eigene Diffs zu bilden. */
export async function loadAgentDetail(admin: SupabaseAdminClient, agentId: string): Promise<AgentDetailResponse | null> {
  const { data: agent, error: agentError } = await admin
    .from('agents')
    .select('id, role, model, status, system_prompt')
    .eq('id', agentId)
    .maybeSingle()
  if (agentError) throw new Error(agentError.message)
  if (!agent) return null

  const { data: rows, error: toolsError } = await admin
    .from('agent_tools')
    .select('tools(id, slug)')
    .eq('agent_id', agentId)
  if (toolsError) throw new Error(toolsError.message)

  // Name kommt aus dem Code-Katalog (public.tools speichert seit Migration 0041 nur noch
  // id/slug), nicht mehr aus einer DB-Kopie.
  const assignedTools: CockpitToolRef[] = (rows ?? [])
    .map((row) => (Array.isArray(row.tools) ? row.tools[0] : row.tools))
    .filter((tool): tool is { id: string; slug: string } => !!tool)
    .map((tool) => ({ id: tool.id, slug: tool.slug, name: CATALOG_BY_SLUG.get(tool.slug)?.label ?? tool.slug }))

  return {
    id: agent.id,
    role: agent.role,
    model: agent.model,
    agentStatus: agent.status,
    systemPrompt: agent.system_prompt,
    assignedTools,
  }
}
