import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { CATALOG } from '../../lib/helm/catalog/registry'
import { SUBAGENTS } from '../../lib/helm/subagents'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../../.env.local') })

const DRY_RUN = process.argv.includes('--dry-run')

// ── Tools aus dem Code ───────────────────────────────────────────────────────
// public.tools speichert seit Migration 0041 nur noch id/slug (reine FK-Zielrelation für
// agent_tools) — Name/Beschreibung/Schema/Bestätigungspflicht kommen zur Laufzeit
// ausschließlich aus lib/helm/catalog/registry.ts#CATALOG (Code ist die einzige Quelle).
// Dieses Skript befüllt public.tools deshalb nur noch mit Slugs, keine Beschreibungsspalten
// mehr — bewusst kein separat gepflegter Katalog in der DB.

interface ParsedTool {
  slug: string
}

function parseTools(): ParsedTool[] {
  return CATALOG.map((def) => ({ slug: def.slug }))
}

// ── agent_tools-Startdaten aus SUBAGENTS[].toolNames ─────────────────────────
// SUBAGENTS.toolNames ist nicht die Laufzeit-Quelle (siehe lib/helm/subagents.ts) — hier
// dient es der Erstbefüllung von public.agent_tools.

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
  const confirmableSlugs = new Set(CATALOG.filter((d) => d.requiresConfirmation).map((d) => d.slug))

  console.log(`Geparst: ${tools.length} Tools aus CATALOG, ${assignments.length} agent_tools-Zuordnungen aus ${SUBAGENTS.length} Sub-Agenten.`)
  console.log(`  Hinweis: ${confirmableSlugs.size} bestätigungspflichtige Tools werden mit-synchronisiert, aber keinem Sub-Agenten zugeordnet — SUBAGENTS referenziert laut Konvention nur lesende Tools.`)

  if (DRY_RUN) {
    console.log('\n[--dry-run] Es wird nichts in Supabase geschrieben.')
    for (const t of tools) console.log(`  tool: ${t.slug}${confirmableSlugs.has(t.slug) ? ' (bestätigungspflichtig)' : ''}`)
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
  const { data: agentRows, error: agentsError } = await supabase.from('agents').select('id, slug').in('slug', agentSlugs)
  if (agentsError) throw new Error(`agents-Lookup fehlgeschlagen: ${agentsError.message}`)
  const agentIdBySlug = new Map((agentRows ?? []).map((a) => [a.slug, a.id]))

  const toolSlugs = [...new Set(assignments.map((a) => a.toolSlug))]
  const { data: toolRows, error: toolLookupError } = await supabase.from('tools').select('id, slug').in('slug', toolSlugs)
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
