import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import type {
  Database,
  LeadPrioritaet,
  LeadStage,
  AkquiseErgebnis,
  QualiErgebnis,
  SalesErgebnis,
} from '../../types/database'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../../.env.local') })

const DRY_RUN = process.argv.includes('--dry-run')
const XLSX_PATH = path.resolve(__dirname, 'Schuck_Webdesign_Akquise.xlsx')
const EXPECTED_COUNT = 259

// ── Parsing-Helfer ────────────────────────────────────────────────────────

function cell(row: unknown[], i: number): unknown {
  return row[i]
}

function str(raw: unknown): string | null {
  return raw == null || String(raw).trim() === '' ? null : String(raw).trim()
}

function toNumber(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') return raw
  const s = String(raw).trim()
  if (!s) return null
  const cleaned = s.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isNaN(n) ? null : n
}

function parseDate(raw: unknown): string | null {
  if (raw == null) return null
  if (raw instanceof Date) return raw.toISOString().slice(0, 10)
  const s = String(raw).trim()
  if (!s) return null
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

function dedupKey(firmenname: string, zielgruppe: string): string {
  return `${firmenname.trim().toLowerCase()}|||${zielgruppe.trim().toLowerCase()}`
}

// Alle Mappings stammen aus dem Dropdown-Referenzblatt "Listen" der Quelldatei
// (Excel-Datenvalidierung) — das ist die vollständige, verbindliche Werteliste,
// nicht nur das, was in den 259 Zeilen zufällig vorkommt.

const PRIORITY_MAP: Record<string, LeadPrioritaet> = { Hoch: 'high', Mittel: 'medium', Niedrig: 'low' }

function parsePrioritaet(raw: unknown): { value: LeadPrioritaet; unmapped: string | null } {
  if (raw == null) return { value: 'medium', unmapped: null }
  const cleaned = String(raw).replace(/[^\p{L}\s]/gu, '').trim()
  const mapped = PRIORITY_MAP[cleaned]
  return mapped ? { value: mapped, unmapped: null } : { value: 'medium', unmapped: String(raw) }
}

const AKQUISE_ERGEBNIS_MAP: Record<string, AkquiseErgebnis> = {
  Offen: 'offen',
  'Nicht erreicht': 'nicht_erreicht',
  Wiedervorlage: 'wiedervorlage',
  'Kein Interesse': 'kein_interesse',
  Qualifiziert: 'qualifiziert',
}

function parseAkquiseErgebnis(raw: unknown): { value: AkquiseErgebnis; unmapped: string | null } {
  const key = str(raw)
  if (!key) return { value: 'offen', unmapped: null }
  const mapped = AKQUISE_ERGEBNIS_MAP[key]
  return mapped ? { value: mapped, unmapped: null } : { value: 'offen', unmapped: key }
}

const QUALI_ERGEBNIS_MAP: Record<string, QualiErgebnis> = {
  Offen: 'offen',
  'Follow-up': 'follow_up',
  Disqualifiziert: 'disqualifiziert',
  Qualifiziert: 'qualifiziert',
}

function parseQualiErgebnis(raw: unknown): { value: QualiErgebnis; unmapped: string | null } {
  const key = str(raw)
  if (!key) return { value: 'offen', unmapped: null }
  const mapped = QUALI_ERGEBNIS_MAP[key]
  return mapped ? { value: mapped, unmapped: null } : { value: 'offen', unmapped: key }
}

const SALES_ERGEBNIS_MAP: Record<string, SalesErgebnis> = {
  Offen: 'offen',
  'Follow-up': 'follow_up',
  Abgelehnt: 'abgelehnt',
  Abgeschlossen: 'abgeschlossen',
}

function parseSalesErgebnis(raw: unknown): { value: SalesErgebnis; unmapped: string | null } {
  const key = str(raw)
  if (!key) return { value: 'offen', unmapped: null }
  const mapped = SALES_ERGEBNIS_MAP[key]
  return mapped ? { value: mapped, unmapped: null } : { value: 'offen', unmapped: key }
}

// ── Sheets parsen ─────────────────────────────────────────────────────────
// "Akquise": ID, Zielgruppe, Firmenname, Ansprechpartner, Position, Stadt / Region,
//   Website, Telefon, E-Mail, Quelle, Website-Qualität, Priorität, Erstkontakt am,
//   Akquise-Ergebnis, Wiedervorlage, Notizen
// "Quali-Calls": ID, Zielgruppe, Firmenname, Ansprechpartner, Telefon, E-Mail,
//   Quali-Call am, Quali-Ergebnis, Wiedervorlage, Bedarf / Notizen
// "Sales-Calls": ID, Zielgruppe, Firmenname, Ansprechpartner, Telefon, E-Mail,
//   Closing-Call am, Leistungen, Angebotsvolumen (€), Leistungsbeginn, Sales-Ergebnis, Notizen
// "ID" ist die im Sheet bereits vergebene Lead-Referenz (L-001 ...) — nur zur
// Verknüpfung von Quali-/Sales-Calls mit dem richtigen Lead. Die tatsächliche
// lead_number wird beim Import frisch über get_next_number gezogen.

interface ParsedLead {
  sourceId: string
  firmenname: string
  ansprechpartner: string | null
  position: string | null
  zielgruppe: string | null
  stadt: string | null
  website: string | null
  phone: string | null
  email: string | null
  quelle: string | null
  website_qualitaet: string | null
  prioritaet: LeadPrioritaet
  erstkontakt_am: string | null
  akquise_ergebnis: AkquiseErgebnis
  wiedervorlage: string | null
  notizen: string | null
  current_stage: LeadStage
  sourceRow: number
}

interface ParsedQualiCall {
  sourceLeadId: string
  quali_call_am: string | null
  quali_ergebnis: QualiErgebnis
  wiedervorlage: string | null
  bedarf_notizen: string | null
  sourceRow: number
}

interface ParsedSalesCall {
  sourceLeadId: string
  closing_call_am: string | null
  leistungen: string | null
  angebotsvolumen: number | null
  leistungsbeginn: string | null
  sales_ergebnis: SalesErgebnis
  notizen: string | null
  sourceRow: number
}

interface UnmappedValue {
  sheet: string
  row: number
  value: string
}

interface MappingReport {
  sheetErrors: string[]
  unmappedPrioritaet: UnmappedValue[]
  unmappedAkquiseErgebnis: UnmappedValue[]
  unmappedQualiErgebnis: UnmappedValue[]
  unmappedSalesErgebnis: UnmappedValue[]
  insertErrors: string[]
  importedLeads: number
  skippedExistingLeads: number
  importedQualiCalls: number
  skippedExistingQualiCalls: number
  importedSalesCalls: number
  skippedExistingSalesCalls: number
}

function parseLeads(rows: unknown[][], report: MappingReport): ParsedLead[] {
  const headerIdx = rows.findIndex((r) => cell(r, 0) === 'ID')
  if (headerIdx === -1) {
    report.sheetErrors.push('Sheet "Akquise": Header-Zeile "ID" nicht gefunden.')
    return []
  }

  const leads: ParsedLead[] = []
  rows.slice(headerIdx + 1).forEach((row, i) => {
    const sourceId = str(cell(row, 0))
    const firmenname = str(cell(row, 2))
    if (!sourceId || !firmenname) return

    const rowNumber = headerIdx + 2 + i

    const prio = parsePrioritaet(cell(row, 11))
    if (prio.unmapped) report.unmappedPrioritaet.push({ sheet: 'Akquise', row: rowNumber, value: prio.unmapped })

    const ergebnis = parseAkquiseErgebnis(cell(row, 13))
    if (ergebnis.unmapped) {
      report.unmappedAkquiseErgebnis.push({ sheet: 'Akquise', row: rowNumber, value: ergebnis.unmapped })
    }

    leads.push({
      sourceId,
      firmenname,
      ansprechpartner: str(cell(row, 3)),
      position: str(cell(row, 4)),
      zielgruppe: str(cell(row, 1)),
      stadt: str(cell(row, 5)),
      website: str(cell(row, 6)),
      phone: str(cell(row, 7)),
      email: str(cell(row, 8)),
      quelle: str(cell(row, 9)),
      website_qualitaet: str(cell(row, 10)),
      prioritaet: prio.value,
      erstkontakt_am: parseDate(cell(row, 12)),
      akquise_ergebnis: ergebnis.value,
      wiedervorlage: parseDate(cell(row, 14)),
      notizen: str(cell(row, 15)),
      current_stage: 'erstkontakt',
      sourceRow: rowNumber,
    })
  })
  return leads
}

function parseQualiCalls(rows: unknown[][], report: MappingReport): ParsedQualiCall[] {
  const headerIdx = rows.findIndex((r) => cell(r, 0) === 'ID')
  if (headerIdx === -1) {
    report.sheetErrors.push('Sheet "Quali-Calls": Header-Zeile "ID" nicht gefunden.')
    return []
  }

  const calls: ParsedQualiCall[] = []
  rows.slice(headerIdx + 1).forEach((row, i) => {
    const sourceLeadId = str(cell(row, 0))
    if (!sourceLeadId) return
    const rowNumber = headerIdx + 2 + i

    const ergebnis = parseQualiErgebnis(cell(row, 7))
    if (ergebnis.unmapped) {
      report.unmappedQualiErgebnis.push({ sheet: 'Quali-Calls', row: rowNumber, value: ergebnis.unmapped })
    }

    calls.push({
      sourceLeadId,
      quali_call_am: parseDate(cell(row, 6)),
      quali_ergebnis: ergebnis.value,
      wiedervorlage: parseDate(cell(row, 8)),
      bedarf_notizen: str(cell(row, 9)),
      sourceRow: rowNumber,
    })
  })
  return calls
}

function parseSalesCalls(rows: unknown[][], report: MappingReport): ParsedSalesCall[] {
  const headerIdx = rows.findIndex((r) => cell(r, 0) === 'ID')
  if (headerIdx === -1) {
    report.sheetErrors.push('Sheet "Sales-Calls": Header-Zeile "ID" nicht gefunden.')
    return []
  }

  const calls: ParsedSalesCall[] = []
  rows.slice(headerIdx + 1).forEach((row, i) => {
    const sourceLeadId = str(cell(row, 0))
    if (!sourceLeadId) return
    const rowNumber = headerIdx + 2 + i

    const ergebnis = parseSalesErgebnis(cell(row, 10))
    if (ergebnis.unmapped) {
      report.unmappedSalesErgebnis.push({ sheet: 'Sales-Calls', row: rowNumber, value: ergebnis.unmapped })
    }

    calls.push({
      sourceLeadId,
      closing_call_am: parseDate(cell(row, 6)),
      leistungen: str(cell(row, 7)),
      angebotsvolumen: toNumber(cell(row, 8)),
      leistungsbeginn: parseDate(cell(row, 9)),
      sales_ergebnis: ergebnis.value,
      notizen: str(cell(row, 11)),
      sourceRow: rowNumber,
    })
  })
  return calls
}

function sheetRows(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: null,
    raw: true,
  })
}

// ── Report ────────────────────────────────────────────────────────────────

function printUnmapped(title: string, values: UnmappedValue[]) {
  if (values.length === 0) return
  console.log(`\n  ${title}:`)
  for (const u of values) console.log(`    - [${u.sheet} Zeile ${u.row}] "${u.value}"`)
}

function printReport(totalLeadsParsed: number, report: MappingReport) {
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

  const report: MappingReport = {
    sheetErrors: [],
    unmappedPrioritaet: [],
    unmappedAkquiseErgebnis: [],
    unmappedQualiErgebnis: [],
    unmappedSalesErgebnis: [],
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
