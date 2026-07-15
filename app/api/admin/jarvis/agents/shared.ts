import { createAdminClient } from '@/lib/supabase/admin'
import type { AgentDetailResponse, CockpitToolRef } from '@/app/(admin)/admin/jarvis/cockpit/types'

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
    .select('tools(id, slug, name)')
    .eq('agent_id', agentId)
  if (toolsError) throw new Error(toolsError.message)

  const assignedTools: CockpitToolRef[] = (rows ?? [])
    .map((row) => (Array.isArray(row.tools) ? row.tools[0] : row.tools))
    .filter((tool): tool is CockpitToolRef => !!tool)

  return {
    id: agent.id,
    role: agent.role,
    model: agent.model,
    agentStatus: agent.status,
    systemPrompt: agent.system_prompt,
    assignedTools,
  }
}
