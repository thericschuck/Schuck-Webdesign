import type { JarvisTool, ToolRegistry } from '../tool-types'
import { runJarvisAgent } from '../agent'
import { SUBAGENTS, type SubAgentDefinition } from '../subagents'
import { AgentDisabledError } from '../errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { clientTools } from './clients'
import { projectTools } from './projects'
import { productTools } from './products'
import { akquiseTools } from './akquise'
import { financeTools } from './finance'
import { documentTools } from './documents'
import { knowledgeTools } from './knowledge'
import { integrationTools } from './integrations'

// Eigene, lokale Zusammenstellung statt Import von ../tools/index — würde sonst einen
// Zirkelbezug erzeugen (index.ts bindet subagentTools aus dieser Datei mit ein).
const ALL_TOOLS: JarvisTool[] = [
  ...clientTools,
  ...projectTools,
  ...productTools,
  ...akquiseTools,
  ...financeTools,
  ...documentTools,
  ...knowledgeTools,
  ...integrationTools,
]
const ALL_TOOLS_BY_NAME = new Map(ALL_TOOLS.map((tool) => [tool.name, tool]))

// Alter Seed-Wert aus 0017_jarvis_phase1_agents.sql — falls eine agents-Zeile (z.B. ein
// künftig neu angelegter Sub-Agent) noch nie über das Cockpit bzw. eine Migration einen
// echten Prompt bekommen hat, wird das wie "kein DB-Prompt vorhanden" behandelt.
const PLACEHOLDER_PROMPT = 'PLATZHALTER: System-Prompt folgt'

/**
 * Liest zur Laufzeit aus public.agents/public.agent_tools (JOIN public.tools, Migration
 * 0017_jarvis_phase1_agents.sql), welcher System-Prompt und welche Tool-Slugs diesem
 * Sub-Agenten zugeordnet sind, und baut daraus die scoped Registry gegen ALL_TOOLS_BY_NAME.
 * public.agents.system_prompt und public.agent_tools sind jetzt die Laufzeit-Quelle der
 * Wahrheit — NICHT mehr def.systemPrompt/def.toolNames (siehe subagents.ts, dort nur noch
 * Fallback + Referenz für die Seed-Daten). Eine Bearbeitung im Cockpit
 * (PATCH /api/admin/jarvis/agents/[id]) wirkt sich damit tatsächlich auf den nächsten Lauf
 * dieses Sub-Agenten aus.
 *
 * Bewusst kein Caching: läuft bei jedem Sub-Agenten-Aufruf frisch, damit eine
 * Änderung an der DB-Zuordnung sofort wirkt statt einen Neudeploy zu brauchen —
 * Sub-Agenten-Aufrufe sind kein Hot-Path (höchstens ein paar pro Konversation).
 */
async function buildScopedRegistry(
  def: SubAgentDefinition
): Promise<{ registry: ToolRegistry; systemPrompt: string; model: string | null }> {
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
  // agents.status ist jetzt Laufzeit-scharf, nicht mehr nur Cockpit-Anzeige: ein über den
  // Bearbeiten-Toggle deaktivierter Sub-Agent darf nicht mehr aufgerufen werden.
  if (agentRow.status !== 'active') {
    throw new AgentDisabledError(def.name)
  }

  const dbPrompt = agentRow.system_prompt?.trim()
  const systemPrompt = dbPrompt && dbPrompt !== PLACEHOLDER_PROMPT ? dbPrompt : def.systemPrompt

  const { data: rows, error } = await adminClient
    .from('agent_tools')
    .select('tools(slug)')
    .eq('agent_id', agentRow.id)

  if (error) {
    throw new Error(`Sub-Agent "${def.name}": agent_tools konnte nicht geladen werden: ${error.message}`)
  }

  const registry: ToolRegistry = new Map()
  for (const row of rows ?? []) {
    const toolRow = Array.isArray(row.tools) ? row.tools[0] : row.tools
    const slug = toolRow?.slug
    if (!slug) continue

    const tool = ALL_TOOLS_BY_NAME.get(slug)
    if (!tool) {
      throw new Error(
        `Sub-Agent "${def.name}" referenziert unbekanntes Tool "${slug}" (nicht in ALL_TOOLS registriert) — public.tools/agent_tools sind nicht mit dem Code synchron. scripts/import/sync-agent-tools.ts erneut ausführen.`
      )
    }
    // Datenintegritäts-Check, nicht nur Build-Zeit-Prüfung: ein bestätigungspflichtiges
    // Tool darf einem Sub-Agenten auch dann nicht zugeordnet sein, wenn das nur über die
    // DB (statt über Code) passiert ist.
    if (tool.requiresConfirmation) {
      throw new Error(
        `Sub-Agent "${def.name}" referenziert das bestätigungspflichtige Tool "${slug}" — Sub-Agenten dürfen nur lesende Tools bekommen. Datenintegritätsfehler in public.agent_tools.`
      )
    }
    registry.set(tool.name, tool)
  }
  return { registry, systemPrompt, model: agentRow.model ?? null }
}

function buildSubAgentTool(def: SubAgentDefinition): JarvisTool {
  return {
    name: def.name,
    requiresConfirmation: false,
    definition: {
      name: def.name,
      description: `${def.label}: fokussierter Sub-Agent. Übergib eine konkrete Aufgabe als "task".`,
      input_schema: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'Konkrete Aufgabe/Frage für diesen Sub-Agenten, in natürlicher Sprache.' },
        },
        required: ['task'],
      },
    },
    async execute(args, context) {
      const task = typeof args.task === 'string' ? args.task : ''
      if (!task.trim()) throw new Error('Parameter "task" ist erforderlich.')

      const { registry: scopedRegistry, systemPrompt, model } = await buildScopedRegistry(def)

      const result = await runJarvisAgent({
        messages: [{ role: 'user', content: task }],
        tools: scopedRegistry,
        systemPrompt,
        model,
        agentSlug: def.name,
        parentRunId: context?.runId,
      })

      if (result.type === 'final') return result.text
      // Kann durch die Prüfung in buildScopedRegistry nicht vorkommen — Absicherung statt Crash.
      return `${def.label} wollte eine bestätigungspflichtige Aktion ausführen, was Sub-Agenten nicht dürfen. Bitte die Aktion direkt über den Haupt-Orchestrator anfordern.`
    },
  }
}

export const subagentTools: JarvisTool[] = SUBAGENTS.map(buildSubAgentTool)
