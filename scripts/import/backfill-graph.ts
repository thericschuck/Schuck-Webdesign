import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { clientDisplayName } from '../../lib/client-name'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../../.env.local') })

const DRY_RUN = process.argv.includes('--dry-run')
const EMBEDDING_MODEL = 'text-embedding-3-small'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local')
}
const supabase = createClient<Database>(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

let openai: OpenAI | null = null
async function embed(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) return null
  openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const response = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: text })
  return response.data[0].embedding
}

// ── Backfill: clients ────────────────────────────────────────────────────

async function backfillClients(): Promise<{ created: number; updated: number; skipped: number }> {
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, company_name, contact_name, website, phone, address_street, address_zip, address_city, profiles(full_name)')
  if (error) throw new Error(`Kunden konnten nicht geladen werden: ${error.message}`)

  const { data: existingNodes, error: nodesError } = await supabase
    .from('nodes')
    .select('id, ref_id, label')
    .eq('ref_table', 'clients')
  if (nodesError) throw new Error(`Bestehende Knoten konnten nicht geladen werden: ${nodesError.message}`)
  const existingByRefId = new Map((existingNodes ?? []).map((n) => [n.ref_id, n]))

  let created = 0
  let updated = 0
  let skipped = 0

  for (const client of clients ?? []) {
    const profile = Array.isArray(client.profiles) ? client.profiles[0] : client.profiles
    const displayName = clientDisplayName(profile?.full_name, client.contact_name, client.company_name)

    const bodyParts = [
      client.website,
      client.phone,
      [client.address_street, client.address_zip, client.address_city].filter(Boolean).join(' '),
    ].filter(Boolean)
    const body = bodyParts.length > 0 ? bodyParts.join(' · ') : null

    const existing = existingByRefId.get(client.id)
    if (existing) {
      if (existing.label === displayName) {
        skipped++
        continue
      }

      console.log(`${DRY_RUN ? '[dry-run] ' : ''}client-Knoten aktualisieren: "${existing.label}" -> "${displayName}"`)
      if (DRY_RUN) {
        updated++
        continue
      }

      const embedding = await embed(`${displayName}\n${body ?? ''}`.trim())
      const { error: updateError } = await supabase
        .from('nodes')
        .update({ label: displayName, body, embedding, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (updateError) {
        console.error(`  Fehler bei ${displayName}: ${updateError.message}`)
        continue
      }
      updated++
      continue
    }

    console.log(`${DRY_RUN ? '[dry-run] ' : ''}client-Knoten: ${displayName}`)
    if (DRY_RUN) {
      created++
      continue
    }

    const embedding = await embed(`${displayName}\n${body ?? ''}`.trim())
    const { error: insertError } = await supabase.from('nodes').insert({
      type: 'client',
      label: displayName,
      body,
      ref_id: client.id,
      ref_table: 'clients',
      source: 'imported',
      embedding,
    })
    if (insertError) {
      console.error(`  Fehler bei ${displayName}: ${insertError.message}`)
      continue
    }
    created++
  }

  return { created, updated, skipped }
}

// ── Backfill: projects ───────────────────────────────────────────────────

async function backfillProjects(): Promise<{ created: number; skipped: number }> {
  const { data: projects, error } = await supabase.from('projects').select('id, title, description')
  if (error) throw new Error(`Projekte konnten nicht geladen werden: ${error.message}`)

  const { data: existingNodes, error: nodesError } = await supabase
    .from('nodes')
    .select('ref_id')
    .eq('ref_table', 'projects')
  if (nodesError) throw new Error(`Bestehende Knoten konnten nicht geladen werden: ${nodesError.message}`)
  const existingIds = new Set((existingNodes ?? []).map((n) => n.ref_id))

  let created = 0
  let skipped = 0

  for (const project of projects ?? []) {
    if (existingIds.has(project.id)) {
      skipped++
      continue
    }

    console.log(`${DRY_RUN ? '[dry-run] ' : ''}project-Knoten: ${project.title}`)
    if (DRY_RUN) {
      created++
      continue
    }

    const embedding = await embed(`${project.title}\n${project.description ?? ''}`.trim())
    const { error: insertError } = await supabase.from('nodes').insert({
      type: 'project',
      label: project.title,
      body: project.description,
      ref_id: project.id,
      ref_table: 'projects',
      source: 'imported',
      embedding,
    })
    if (insertError) {
      console.error(`  Fehler bei ${project.title}: ${insertError.message}`)
      continue
    }
    created++
  }

  return { created, skipped }
}

// ── Entry point ──────────────────────────────────────────────────────────

async function run() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠ OPENAI_API_KEY fehlt — Knoten werden ohne Embedding angelegt (keine Semantic Search bis zum Re-Embed).')
  }

  const clientsResult = await backfillClients()
  const projectsResult = await backfillProjects()

  console.log('')
  console.log(
    `Kunden:   ${clientsResult.created} angelegt, ${clientsResult.updated} aktualisiert, ${clientsResult.skipped} übersprungen (unverändert)`
  )
  console.log(`Projekte: ${projectsResult.created} angelegt, ${projectsResult.skipped} übersprungen (bereits vorhanden)`)
  if (DRY_RUN) console.log('\n(--dry-run: keine Schreibvorgänge ausgeführt)')
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
