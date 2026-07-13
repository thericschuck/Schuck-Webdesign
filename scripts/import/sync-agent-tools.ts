import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../types/database'
import type { JarvisTool } from '../../lib/jarvis/tool-types'
import { SUBAGENTS } from '../../lib/jarvis/subagents'
import { clientTools } from '../../lib/jarvis/tools/clients'
import { projectTools } from '../../lib/jarvis/tools/projects'
import { productTools } from '../../lib/jarvis/tools/products'
import { akquiseTools } from '../../lib/jarvis/tools/akquise'
import { financeTools } from '../../lib/jarvis/tools/finance'
import { documentTools } from '../../lib/jarvis/tools/documents'
import { knowledgeTools } from '../../lib/jarvis/tools/knowledge'
import { integrationTools } from '../../lib/jarvis/tools/integrations'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../../.env.local') })

const DRY_RUN = process.argv.includes('--dry-run')

// ── Tools aus dem Code ───────────────────────────────────────────────────────
// Dieselbe Zusammenstellung wie lib/jarvis/tools/subagents.ts#ALL_TOOLS — bewusst
// hier noch mal lokal aufgebaut statt von dort importiert, sonst landet man über
// subagents.ts -> ../agent -> ./tools (index.ts) -> subagents.ts wieder im
// Zirkelbezug, den subagents.ts selbst genau deswegen vermeidet. Einzeln sind die
// Tool-Module aber Blätter im Graph und lassen sich hier bedenkenlos zusammenführen —
// einzige Quelle für "welche Tools gibt es im Code", kein separat gepflegter Katalog.
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

interface ParsedTool {
  slug: string
  name: string
  description: string | null
  input_schema: Json
  is_irreversible: boolean
}

function parseTools(): ParsedTool[] {
  return ALL_TOOLS.map((tool) => ({
    slug: tool.name,
    name: tool.name,
    description: tool.definition.description ?? null,
    input_schema: tool.definition.input_schema as unknown as Json,
    is_irreversible: tool.requiresConfirmation,
  }))
}

// ── agent_tools-Startdaten aus SUBAGENTS[].toolNames ─────────────────────────
// SUBAGENTS.toolNames ist seit dem Umbau auf DB-gestützte Sub-Agent-Tools nicht
// mehr die Laufzeit-Quelle (siehe lib/jarvis/subagents.ts) — hier dient es genau
// dem im Kommentar dort beschriebenen Zweck: Referenz für die Erstbefüllung.

interface ParsedAssignment {
  agentSlug: string
  toolSlug: string
}

function parseAssignments(): ParsedAssignment[] {
  const assignments: ParsedAssignment[] = []
  for (const def of SUBAGENTS) {
    for (const toolName of def.toolNames) {
      assignments.push({ agentSlug: def.name, toolSlug: toolName })
    }
  }
  return assignments
}

// ── Hauptlauf ─────────────────────────────────────────────────────────────

async function run() {
  const tools = parseTools()
  const assignments = parseAssignments()

  console.log(`Geparst: ${tools.length} Tools aus ALL_TOOLS, ${assignments.length} agent_tools-Zuordnungen aus ${SUBAGENTS.length} Sub-Agenten.`)

  const irreversible = tools.filter((t) => t.is_irreversible)
  if (irreversible.length > 0) {
    console.log(`  Hinweis: ${irreversible.length} bestätigungspflichtige Tools (is_irreversible) werden mit-synchronisiert, aber keinem Sub-Agenten zugeordnet — SUBAGENTS referenziert laut Konvention nur lesende Tools.`)
  }

  if (DRY_RUN) {
    console.log('\n[--dry-run] Es wird nichts in Supabase geschrieben.')
    for (const t of tools) console.log(`  tool: ${t.slug}${t.is_irreversible ? ' (bestätigungspflichtig)' : ''}`)
    for (const a of assignments) console.log(`  agent_tools: ${a.agentSlug} -> ${a.toolSlug}`)
    return
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local')
  }

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. public.tools synchronisieren (slug = Konflikt-Schlüssel)
  const { error: toolsError } = await supabase.from('tools').upsert(tools, { onConflict: 'slug' })
  if (toolsError) throw new Error(`Tools-Sync fehlgeschlagen: ${toolsError.message}`)

  // 2. agents.slug -> agents.id und tools.slug -> tools.id auflösen
  const agentSlugs = [...new Set(assignments.map((a) => a.agentSlug))]
  const { data: agentRows, error: agentsError } = await supabase
    .from('agents')
    .select('id, slug')
    .in('slug', agentSlugs)
  if (agentsError) throw new Error(`agents-Lookup fehlgeschlagen: ${agentsError.message}`)
  const agentIdBySlug = new Map((agentRows ?? []).map((a) => [a.slug, a.id]))

  const toolSlugs = [...new Set(assignments.map((a) => a.toolSlug))]
  const { data: toolRows, error: toolLookupError } = await supabase
    .from('tools')
    .select('id, slug')
    .in('slug', toolSlugs)
  if (toolLookupError) throw new Error(`tools-Lookup fehlgeschlagen: ${toolLookupError.message}`)
  const toolIdBySlug = new Map((toolRows ?? []).map((t) => [t.slug, t.id]))

  // 3. public.agent_tools befüllen
  const warnings: string[] = []
  const agentToolsToUpsert: { agent_id: string; tool_id: string }[] = []
  for (const a of assignments) {
    const agentId = agentIdBySlug.get(a.agentSlug)
    const toolId = toolIdBySlug.get(a.toolSlug)
    if (!agentId) {
      warnings.push(`Agent "${a.agentSlug}" nicht in public.agents gefunden (Migration 0017 ausgeführt?) — übersprungen.`)
      continue
    }
    if (!toolId) {
      warnings.push(`Tool "${a.toolSlug}" nicht in public.tools gefunden — übersprungen.`)
      continue
    }
    agentToolsToUpsert.push({ agent_id: agentId, tool_id: toolId })
  }

  if (agentToolsToUpsert.length > 0) {
    const { error: agentToolsError } = await supabase
      .from('agent_tools')
      .upsert(agentToolsToUpsert, { onConflict: 'agent_id,tool_id' })
    if (agentToolsError) throw new Error(`agent_tools-Sync fehlgeschlagen: ${agentToolsError.message}`)
  }

  console.log(`\n✓ ${tools.length} Tools synchronisiert, ${agentToolsToUpsert.length} agent_tools-Zuordnungen angelegt.`)
  if (warnings.length > 0) {
    console.log('\n── Warnungen ──')
    for (const w of warnings) console.log(`  ${w}`)
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
