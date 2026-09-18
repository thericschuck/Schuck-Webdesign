import { z } from 'zod'
import { defineTool, type HelmToolDef } from './catalog/types'
import { BASE_TOOLS_BY_SLUG } from './catalog/base-tools'
import { buildAiSdkTools } from './catalog/build'
import { runHelmAgent } from './core/run'
import { SUBAGENTS, type SubAgentDefinition } from './subagents'
import { AgentDisabledError } from './core/errors'
import { createAdminClient } from '@/lib/supabase/admin'

// Alter Seed-Wert aus 0017_jarvis_phase1_agents.sql — falls eine agents-Zeile noch nie
// über das Cockpit bzw. eine Migration einen echten Prompt bekommen hat, wird das wie
// "kein DB-Prompt vorhanden" behandelt.
const PLACEHOLDER_PROMPT = 'PLATZHALTER: System-Prompt folgt'

/**
 * Liest zur Laufzeit aus public.agents/public.agent_tools (JOIN public.tools), welcher
 * System-Prompt und welche Tool-Slugs diesem Sub-Agenten zugeordnet sind, und baut daraus
 * die skalierte Tool-Map gegen BASE_TOOLS_BY_SLUG. public.agents.system_prompt und
 * public.agent_tools sind die Laufzeit-Quelle der Wahrheit — NICHT def.systemPrompt/
 * def.toolNames (siehe subagents.ts, dort nur Fallback + Seed-Referenz).
 *
 * Bewusst kein Caching: läuft bei jedem Sub-Agenten-Aufruf frisch, damit eine Änderung an
 * der DB-Zuordnung sofort wirkt — Sub-Agenten-Aufrufe sind kein Hot-Path.
 */
/** Exportiert, damit app/api/cron/helm-automations/route.ts (lib/helm/automations.ts) dieselbe
 * Sub-Agenten-Auflösung für automatisierte Läufe wiederverwenden kann statt sie zu duplizieren. */
export async function buildScopedRegistry(
  def: SubAgentDefinition
): Promise<{ defs: HelmToolDef[]; systemPrompt: string; model: string | null }> {
  const adminClient = createAdminClient()

  const { data: agentRow, error: agentError } = await adminClient
    .from('agents')
    .select('id, status, system_prompt, model')
    .eq('slug', def.name)
    .maybeSingle()

  if (agentError) {
    throw new Error(`Sub-Agent "${def.name}": agents-Eintrag konnte nicht geladen werden: ${agentError.message}`)
  }
  if (!agentRow) {
    throw new Error(`Sub-Agent "${def.name}" ist nicht in public.agents angelegt (agents.slug fehlt).`)
  }
  if (agentRow.status !== 'active') {
    throw new AgentDisabledError(def.name)
  }

  const dbPrompt = agentRow.system_prompt?.trim()
  const systemPrompt = dbPrompt && dbPrompt !== PLACEHOLDER_PROMPT ? dbPrompt : def.systemPrompt

  const { data: rows, error } = await adminClient.from('agent_tools').select('tools(slug)').eq('agent_id', agentRow.id)

  if (error) {
    throw new Error(`Sub-Agent "${def.name}": agent_tools konnte nicht geladen werden: ${error.message}`)
  }

  const defs: HelmToolDef[] = []
  for (const row of rows ?? []) {
    const toolRow = Array.isArray(row.tools) ? row.tools[0] : row.tools
    const slug = toolRow?.slug
    if (!slug) continue

    const toolDef = BASE_TOOLS_BY_SLUG.get(slug)
    if (!toolDef) {
      throw new Error(
        `Sub-Agent "${def.name}" referenziert unbekanntes Tool "${slug}" (nicht im Katalog) — public.tools/agent_tools sind nicht mit dem Code synchron. scripts/import/sync-tool-catalog.ts erneut ausführen.`
      )
    }
    // Datenintegritäts-Check, nicht nur Build-Zeit-Prüfung: ein bestätigungspflichtiges Tool
    // darf einem Sub-Agenten auch dann nicht zugeordnet sein, wenn das nur über die DB
    // (statt über Code) passiert ist.
    if (toolDef.requiresConfirmation) {
      throw new Error(
        `Sub-Agent "${def.name}" referenziert das bestätigungspflichtige Tool "${slug}" — Sub-Agenten dürfen nur lesende Tools bekommen. Datenintegritätsfehler in public.agent_tools.`
      )
    }
    defs.push(toolDef)
  }

  return { defs, systemPrompt, model: agentRow.model ?? null }
}

function buildDelegateTool(def: SubAgentDefinition): HelmToolDef {
  return defineTool({
    slug: def.name,
    label: def.label,
    description: `${def.label}: fokussierter Sub-Agent. Übergib eine konkrete Aufgabe als "task".`,
    category: 'Sub-Agenten',
    requiresConfirmation: false,
    schema: z.object({
      task: z.string().min(1).describe('Konkrete Aufgabe/Frage für diesen Sub-Agenten, in natürlicher Sprache.'),
    }),
    async execute(args, context) {
      const { defs, systemPrompt, model } = await buildScopedRegistry(def)

      const result = await runHelmAgent({
        messages: [{ role: 'user', content: args.task }],
        buildTools: (ctx) => buildAiSdkTools(defs, ctx),
        systemPrompt,
        model,
        agentSlug: def.name,
        parentRunId: context?.runId,
      })

      return await result.text
    },
  })
}

/** Baut die 6 Sub-Agenten-Delegations-Tools als ganz normale Katalog-Einträge — siehe
 * lib/helm/catalog/registry.ts, das diese Funktion aufruft. */
export function buildDelegateTools(): HelmToolDef[] {
  return SUBAGENTS.map(buildDelegateTool)
}
