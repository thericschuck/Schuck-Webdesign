import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import {
  newMappingReport,
  parseLeads,
  parseQualiCalls,
  parseSalesCalls,
  type MappingReport,
  type UnmappedValue,
} from '../../lib/domain/akquise-mapping'
import type { Database } from '../../types/database'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../../.env.local') })

const DRY_RUN = process.argv.includes('--dry-run')
const XLSX_PATH = path.resolve(__dirname, 'Schuck_Webdesign_Akquise.xlsx')
const EXPECTED_COUNT = 259

// Dieses Script war der einmalige Erstimport aus der lokalen Excel-Datei, bevor die
// Akquise ins Google Sheet umgezogen ist. Die Mapping-Logik lebt jetzt in
// lib/domain/akquise-mapping.ts (gemeinsam mit dem laufenden Sheet-Sync,
// lib/domain/akquise-sync.ts) — dieses Script bleibt nur als Fallback/Referenz für
// einen erneuten Excel-Import, wird für den Regelbetrieb aber nicht mehr benötigt.

function dedupKey(firmenname: string, zielgruppe: string): string {
  return `${firmenname.trim().toLowerCase()}|||${zielgruppe.trim().toLowerCase()}`
}

function sheetRows(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: null,
    raw: true,
  })
}

// ── Report ────────────────────────────────────────────────────────────────

interface ImportReport extends MappingReport {
  insertErrors: string[]
  importedLeads: number
  skippedExistingLeads: number
  importedQualiCalls: number
  skippedExistingQualiCalls: number
  importedSalesCalls: number
  skippedExistingSalesCalls: number
}

function printUnmapped(title: string, values: UnmappedValue[]) {
  if (values.length === 0) return
  console.log(`\n  ${title}:`)
  for (const u of values) console.log(`    - [${u.sheet} Zeile ${u.row}] "${u.value}"`)
}

function printReport(totalLeadsParsed: number, report: ImportReport) {
  console.log('\n── Mapping-Report ──')
  console.log(`  Gefundene Leads in der Excel: ${totalLeadsParsed}`)
  if (totalLeadsParsed !== EXPECTED_COUNT) {
    console.log(
      `  ⚠ Erwartet waren ${EXPECTED_COUNT} Bestandsleads — gefunden wurden ${totalLeadsParsed}. ` +
        `Es wurde nichts geraten oder aufgefüllt, verarbeitet wurden ausschließlich die tatsächlich vorhandenen Zeilen.`
    )
  }

  if (report.sheetErrors.length > 0) {
    console.log('\n  Sheet-Fehler:')
    for (const e of report.sheetErrors) console.log(`    - ${e}`)
  }

  printUnmapped('Nicht zuordenbare Priorität-Werte (Fallback: medium)', report.unmappedPrioritaet)
  printUnmapped('Nicht zuordenbare Akquise-Ergebnis-Werte (Fallback: offen)', report.unmappedAkquiseErgebnis)
  printUnmapped('Nicht zuordenbare Quali-Ergebnis-Werte (Fallback: offen)', report.unmappedQualiErgebnis)
  printUnmapped('Nicht zuordenbare Sales-Ergebnis-Werte (Fallback: offen)', report.unmappedSalesErgebnis)

  if (report.insertErrors.length > 0) {
    console.log('\n  Insert-Fehler:')
    for (const e of report.insertErrors) console.log(`    - ${e}`)
  }

  if (!DRY_RUN) {
    console.log(`\n  Leads — neu importiert: ${report.importedLeads}, bereits vorhanden: ${report.skippedExistingLeads}`)
    console.log(`  Quali-Calls — neu importiert: ${report.importedQualiCalls}, bereits vorhanden: ${report.skippedExistingQualiCalls}`)
    console.log(`  Sales-Calls — neu importiert: ${report.importedSalesCalls}, bereits vorhanden: ${report.skippedExistingSalesCalls}`)
  }
}

// ── Hauptlauf ─────────────────────────────────────────────────────────────

async function run() {
  const workbook = XLSX.readFile(XLSX_PATH, { cellDates: true })

  const report: ImportReport = {
    ...newMappingReport(),
    insertErrors: [],
    importedLeads: 0,
    skippedExistingLeads: 0,
    importedQualiCalls: 0,
    skippedExistingQualiCalls: 0,
    importedSalesCalls: 0,
    skippedExistingSalesCalls: 0,
  }

  const leads = parseLeads(sheetRows(workbook, 'Akquise'), report)
  const qualiCalls = parseQualiCalls(sheetRows(workbook, 'Quali-Calls'), report)
  const salesCalls = parseSalesCalls(sheetRows(workbook, 'Sales-Calls'), report)

  // Stage aus vorhandenen Quali-/Sales-Call-Einträgen ableiten (Sales > Quali > Erstkontakt).
  const qualiLeadIds = new Set(qualiCalls.map((q) => q.sourceLeadId))
  const salesLeadIds = new Set(salesCalls.map((s) => s.sourceLeadId))
  for (const lead of leads) {
    if (salesLeadIds.has(lead.sourceId)) lead.current_stage = 'closing_call'
    else if (qualiLeadIds.has(lead.sourceId)) lead.current_stage = 'quali_call'
  }

  console.log(
    `Geparst: ${leads.length} Leads, ${qualiCalls.length} Quali-Call(s), ${salesCalls.length} Sales-Call(s) ` +
      `("Akquise-Tracking" enthält keine echten Datenzeilen — wird nicht importiert; "Kunden"-Sheet ist ein ` +
      `Referenz-Cross-Check zu bereits bestehenden Kunden und wird nicht importiert, um keine Duplikate anzulegen).`
  )

  if (DRY_RUN) {
    console.log('\n[--dry-run] Es wird nichts in Supabase geschrieben.')
    printReport(leads.length, report)
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

  const { data: existingLeads, error: existingError } = await supabase.from('leads').select('id, firmenname, zielgruppe')
  if (existingError) throw new Error(`Bestehende Leads konnten nicht geladen werden: ${existingError.message}`)

  const existingByKey = new Map((existingLeads ?? []).map((l) => [dedupKey(l.firmenname, l.zielgruppe ?? ''), l.id]))
  const sourceIdToLeadId = new Map<string, string>()

  // Leads in Excel-Reihenfolge importieren, damit L-Nummern die Reihenfolge der Tabelle widerspiegeln.
  for (const lead of leads) {
    const key = dedupKey(lead.firmenname, lead.zielgruppe ?? '')
    const existingId = existingByKey.get(key)
    if (existingId) {
      sourceIdToLeadId.set(lead.sourceId, existingId)
      report.skippedExistingLeads++
      continue
    }

    const { data: seq, error: seqError } = await supabase.rpc('get_next_number', { p_typ: 'L', p_scope: '' })
    if (seqError) {
      report.insertErrors.push(`${lead.firmenname} (Zeile ${lead.sourceRow}): Nummernvergabe fehlgeschlagen — ${seqError.message}`)
      continue
    }
    const leadNumber = `L-${String(seq).padStart(3, '0')}`

    const { data: inserted, error } = await supabase
      .from('leads')
      .insert({
        lead_number: leadNumber,
        sheet_lead_id: lead.sourceId,
        firmenname: lead.firmenname,
        ansprechpartner: lead.ansprechpartner,
        position: lead.position,
        zielgruppe: lead.zielgruppe,
        stadt: lead.stadt,
        website: lead.website,
        phone: lead.phone,
        email: lead.email,
        quelle: lead.quelle,
        website_qualitaet: lead.website_qualitaet,
        prioritaet: lead.prioritaet,
        erstkontakt_am: lead.erstkontakt_am,
        akquise_ergebnis: lead.akquise_ergebnis,
        wiedervorlage: lead.wiedervorlage,
        notizen: lead.notizen,
        current_stage: lead.current_stage,
      })
      .select('id')
      .single()

    if (error || !inserted) {
      report.insertErrors.push(`${lead.firmenname} (${leadNumber}): ${error?.message ?? 'unbekannter Fehler'}`)
      continue
    }

    existingByKey.set(key, inserted.id)
    sourceIdToLeadId.set(lead.sourceId, inserted.id)
    report.importedLeads++
  }

  // Quali-Calls (idempotent: höchstens ein Eintrag pro Lead wird importiert)
  for (const call of qualiCalls) {
    const leadId = sourceIdToLeadId.get(call.sourceLeadId)
    if (!leadId) {
      report.insertErrors.push(`Quali-Call für unbekannten Lead ${call.sourceLeadId} (Zeile ${call.sourceRow}) übersprungen.`)
      continue
    }

    const { data: existing } = await supabase.from('quali_calls').select('id').eq('lead_id', leadId).limit(1)
    if (existing && existing.length > 0) {
      report.skippedExistingQualiCalls++
      continue
    }

    const { error } = await supabase.from('quali_calls').insert({
      lead_id: leadId,
      quali_call_am: call.quali_call_am,
      quali_ergebnis: call.quali_ergebnis,
      wiedervorlage: call.wiedervorlage,
      bedarf_notizen: call.bedarf_notizen,
    })
    if (error) {
      report.insertErrors.push(`Quali-Call ${call.sourceLeadId} (Zeile ${call.sourceRow}): ${error.message}`)
      continue
    }
    report.importedQualiCalls++
  }

  // Sales-Calls (idempotent: höchstens ein Eintrag pro Lead wird importiert)
  for (const call of salesCalls) {
    const leadId = sourceIdToLeadId.get(call.sourceLeadId)
    if (!leadId) {
      report.insertErrors.push(`Sales-Call für unbekannten Lead ${call.sourceLeadId} (Zeile ${call.sourceRow}) übersprungen.`)
      continue
    }

    const { data: existing } = await supabase.from('sales_calls').select('id').eq('lead_id', leadId).limit(1)
    if (existing && existing.length > 0) {
      report.skippedExistingSalesCalls++
      continue
    }

    const { error } = await supabase.from('sales_calls').insert({
      lead_id: leadId,
      closing_call_am: call.closing_call_am,
      leistungen: call.leistungen,
      angebotsvolumen: call.angebotsvolumen,
      leistungsbeginn: call.leistungsbeginn,
      sales_ergebnis: call.sales_ergebnis,
      notizen: call.notizen,
    })
    if (error) {
      report.insertErrors.push(`Sales-Call ${call.sourceLeadId} (Zeile ${call.sourceRow}): ${error.message}`)
      continue
    }
    report.importedSalesCalls++
  }

  printReport(leads.length, report)
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
