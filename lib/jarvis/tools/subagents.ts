import type { JarvisTool, ToolRegistry } from '../tool-types'
import { runJarvisAgent } from '../agent'
import { SUBAGENTS, type SubAgentDefinition } from '../subagents'
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

/**
 * Liest zur Laufzeit aus public.agent_tools (JOIN public.agents/public.tools aus
 * Migration 0017_jarvis_phase1_agents.sql), welche Tool-Slugs diesem Sub-Agenten
 * zugeordnet sind, und baut daraus die scoped Registry gegen ALL_TOOLS_BY_NAME.
 * public.agent_tools ist jetzt die Laufzeit-Quelle der Wahrheit — NICHT mehr
 * def.toolNames (siehe subagents.ts, dort nur noch Referenz für die Seed-Daten).
 *
 * Bewusst kein Caching: läuft bei jedem Sub-Agenten-Aufruf frisch, damit eine
 * Änderung an der DB-Zuordnung sofort wirkt statt einen Neudeploy zu brauchen —
 * Sub-Agenten-Aufrufe sind kein Hot-Path (höchstens ein paar pro Konversation).
 */
async function buildScopedRegistry(def: SubAgentDefinition): Promise<ToolRegistry> {
  const adminClient = createAdminClient()

  const { data: agentRow, error: agentError } = await adminClient
    .from('agents')
    .select('id')
    .eq('slug', def.name)
    .maybeSingle()

  if (agentError) {
    throw new Error(`Sub-Agent "${def.name}": agents-Eintrag konnte nicht geladen werden: ${agentError.message}`)
  }
  if (!agentRow) {
    throw new Error(`Sub-Agent "${def.name}" ist nicht in public.agents angelegt (agents.slug fehlt).`)
  }

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
  return registry
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
    async execute(args) {
      const task = typeof args.task === 'string' ? args.task : ''
      if (!task.trim()) throw new Error('Parameter "task" ist erforderlich.')

      const scopedRegistry = await buildScopedRegistry(def)

      const result = await runJarvisAgent({
        messages: [{ role: 'user', content: task }],
        tools: scopedRegistry,
        systemPrompt: def.systemPrompt,
      })

      if (result.type === 'final') return result.text
      // Kann durch die Prüfung in buildScopedRegistry nicht vorkommen — Absicherung statt Crash.
      return `${def.label} wollte eine bestätigungspflichtige Aktion ausführen, was Sub-Agenten nicht dürfen. Bitte die Aktion direkt über den Haupt-Orchestrator anfordern.`
    },
  }
}

export const subagentTools: JarvisTool[] = SUBAGENTS.map(buildSubAgentTool)
