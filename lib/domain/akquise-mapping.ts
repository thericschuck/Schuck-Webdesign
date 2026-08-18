import type { AkquiseErgebnis, LeadPrioritaet, LeadStage, QualiErgebnis, SalesErgebnis } from '@/types/database'

/**
 * Parser für die Akquise-Sheets ("Akquise", "Quali-Calls", "Sales-Calls") — arbeitet auf
 * rohen Zeilen-Arrays (unknown[][]), egal ob die Quelle eine lokale Excel-Datei
 * (XLSX.utils.sheet_to_json mit header:1) oder die Google Sheets API (values.batchGet)
 * ist. Ursprünglich aus scripts/import/import-leads.ts extrahiert, damit der einmalige
 * CLI-Import und der laufende App-Sync (lib/domain/akquise-sync.ts) dieselbe Mapping-Logik
 * verwenden.
 */

export function cell(row: unknown[], i: number): unknown {
  return row[i]
}

export function str(raw: unknown): string | null {
  return raw == null || String(raw).trim() === '' ? null : String(raw).trim()
}

export function toNumber(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') return raw
  const s = String(raw).trim()
  if (!s) return null
  const cleaned = s.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isNaN(n) ? null : n
}

export function parseDate(raw: unknown): string | null {
  if (raw == null) return null
  if (raw instanceof Date) return raw.toISOString().slice(0, 10)
  const s = String(raw).trim()
  if (!s) return null
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

export function dedupKey(firmenname: string, zielgruppe: string): string {
  return `${firmenname.trim().toLowerCase()}|||${zielgruppe.trim().toLowerCase()}`
}

// Alle Mappings stammen aus dem Dropdown-Referenzblatt "Listen" der Quelldatei
// (Excel-Datenvalidierung) — das ist die vollständige, verbindliche Werteliste,
// nicht nur das, was zufällig in den Zeilen vorkommt.

const PRIORITY_MAP: Record<string, LeadPrioritaet> = { Hoch: 'high', Mittel: 'medium', Niedrig: 'low' }

export function parsePrioritaet(raw: unknown): { value: LeadPrioritaet; unmapped: string | null } {
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

export function parseAkquiseErgebnis(raw: unknown): { value: AkquiseErgebnis; unmapped: string | null } {
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

export function parseQualiErgebnis(raw: unknown): { value: QualiErgebnis; unmapped: string | null } {
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

export function parseSalesErgebnis(raw: unknown): { value: SalesErgebnis; unmapped: string | null } {
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
// "ID" ist die im Sheet vergebene Lead-Referenz (L-001 ...) — verknüpft Quali-/Sales-Calls
// mit dem richtigen Lead und dient dem Sync als stabiler Match-Key (leads.sheet_lead_id).

export interface ParsedLead {
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

export interface ParsedQualiCall {
  sourceLeadId: string
  /** Firmenname aus der Quali-Calls-Zeile selbst — Plausibilitätscheck gegen den per
   * sourceLeadId gematchten Akquise-Lead (siehe akquise-sync.ts). Die ID-Spalte kann im
   * Sheet veraltet/verrutscht sein, ohne dass das sofort auffällt. */
  firmenname: string | null
  quali_call_am: string | null
  quali_ergebnis: QualiErgebnis
  wiedervorlage: string | null
  bedarf_notizen: string | null
  sourceRow: number
}

export interface ParsedSalesCall {
  sourceLeadId: string
  /** Firmenname aus der Sales-Calls-Zeile selbst — siehe ParsedQualiCall.firmenname. */
  firmenname: string | null
  closing_call_am: string | null
  leistungen: string | null
  angebotsvolumen: number | null
  leistungsbeginn: string | null
  sales_ergebnis: SalesErgebnis
  notizen: string | null
  sourceRow: number
}

export interface UnmappedValue {
  sheet: string
  row: number
  value: string
}

export interface MappingReport {
  sheetErrors: string[]
  unmappedPrioritaet: UnmappedValue[]
  unmappedAkquiseErgebnis: UnmappedValue[]
  unmappedQualiErgebnis: UnmappedValue[]
  unmappedSalesErgebnis: UnmappedValue[]
}

export function newMappingReport(): MappingReport {
  return { sheetErrors: [], unmappedPrioritaet: [], unmappedAkquiseErgebnis: [], unmappedQualiErgebnis: [], unmappedSalesErgebnis: [] }
}

export function parseLeads(rows: unknown[][], report: MappingReport): ParsedLead[] {
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

export function parseQualiCalls(rows: unknown[][], report: MappingReport): ParsedQualiCall[] {
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
      firmenname: str(cell(row, 2)),
      quali_call_am: parseDate(cell(row, 6)),
      quali_ergebnis: ergebnis.value,
      wiedervorlage: parseDate(cell(row, 8)),
      bedarf_notizen: str(cell(row, 9)),
      sourceRow: rowNumber,
    })
  })
  return calls
}

export function parseSalesCalls(rows: unknown[][], report: MappingReport): ParsedSalesCall[] {
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
      firmenname: str(cell(row, 2)),
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

// ── Akquise-Tracking parsen ────────────────────────────────────────────────
// "Akquise-Tracking": Datum, Wer, Wählversuche, Gespräche mit Empfang, Quote Empfang,
//   Gespräche mit Entscheider, Quote Empfang Überwindung, Termine vereinbart, Quote Quali-Call
// Quote-Spalten sind reine Anzeige-Berechnungen im Sheet und werden nicht übernommen.

export interface ParsedTrackingRow {
  datum: string
  wer: string
  waehlversuche: number
  gespraeche_empfang: number
  gespraeche_entscheider: number
  termine_vereinbart: number
  sourceRow: number
}

export function parseTrackingRows(rows: unknown[][], report: MappingReport): ParsedTrackingRow[] {
  const headerIdx = rows.findIndex((r) => cell(r, 0) === 'Datum')
  if (headerIdx === -1) {
    report.sheetErrors.push('Sheet "Akquise-Tracking": Header-Zeile "Datum" nicht gefunden.')
    return []
  }

  const out: ParsedTrackingRow[] = []
  rows.slice(headerIdx + 1).forEach((row, i) => {
    const datum = parseDate(cell(row, 0))
    const wer = str(cell(row, 1))
    if (!datum || !wer) return
    const rowNumber = headerIdx + 2 + i

    out.push({
      datum,
      wer,
      waehlversuche: toNumber(cell(row, 2)) ?? 0,
      gespraeche_empfang: toNumber(cell(row, 3)) ?? 0,
      gespraeche_entscheider: toNumber(cell(row, 5)) ?? 0,
      termine_vereinbart: toNumber(cell(row, 7)) ?? 0,
      sourceRow: rowNumber,
    })
  })
  return out
}
