import type { JarvisTool, ToolRegistry } from '../tool-types'
import { runJarvisAgent } from '../agent'
import { SUBAGENTS, type SubAgentDefinition } from '../subagents'
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

function buildScopedRegistry(def: SubAgentDefinition): ToolRegistry {
  const registry: ToolRegistry = new Map()
  for (const toolName of def.toolNames) {
    const tool = ALL_TOOLS_BY_NAME.get(toolName)
    if (!tool) throw new Error(`Sub-Agent "${def.name}" referenziert unbekanntes Tool "${toolName}".`)
    if (tool.requiresConfirmation) {
      throw new Error(
        `Sub-Agent "${def.name}" referenziert das bestätigungspflichtige Tool "${toolName}" — Sub-Agenten dürfen nur lesende Tools bekommen.`
      )
    }
    registry.set(tool.name, tool)
  }
  return registry
}

function buildSubAgentTool(def: SubAgentDefinition): JarvisTool {
  const scopedRegistry = buildScopedRegistry(def)

  return {
    name: def.name,
    requiresConfirmation: false,
    definition: {
      name: def.name,
      description: `${def.label}: fokussierter Sub-Agent für ${def.toolNames.join(', ')}. Übergib eine konkrete Aufgabe als "task".`,
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

      const result = await runJarvisAgent({
        messages: [{ role: 'user', content: task }],
        tools: scopedRegistry,
        systemPrompt: def.systemPrompt,
      })

      if (result.type === 'final') return result.text
      // Kann durch die Assertion in buildScopedRegistry nicht vorkommen — Absicherung statt Crash.
      return `${def.label} wollte eine bestätigungspflichtige Aktion ausführen, was Sub-Agenten nicht dürfen. Bitte die Aktion direkt über den Haupt-Orchestrator anfordern.`
    },
  }
}

export const subagentTools: JarvisTool[] = SUBAGENTS.map(buildSubAgentTool)
