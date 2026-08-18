import { createAdminClient } from '@/lib/supabase/admin'
import { DomainError } from './errors'
import * as sheets from '@/lib/integrations/sheets'
import { logIntegrationCall } from '@/lib/integrations/log'
import {
  newMappingReport,
  parseLeads,
  parseQualiCalls,
  parseSalesCalls,
  parseTrackingRows,
  type ParsedLead,
  type UnmappedValue,
} from './akquise-mapping'
import type { AkquiseErgebnis, LeadPrioritaet, LeadStage } from '@/types/database'

export interface SyncResult {
  leadsInserted: number
  leadsUpdated: number
  leadsSkippedAlreadyClient: number
  qualiCallsUpserted: number
  salesCallsUpserted: number
  trackingRowsUpserted: number
  changesLogged: number
  unmapped: UnmappedValue[]
  sheetErrors: string[]
  errors: string[]
}

function deriveStage(lead: ParsedLead, hasQuali: boolean, hasSales: boolean, salesErgebnis?: string): LeadStage {
  if (salesErgebnis === 'abgeschlossen') return 'gewonnen'
  if (salesErgebnis === 'abgelehnt') return 'verloren'
  if (hasSales) return 'closing_call'
  if (hasQuali) return 'quali_call'
  if (lead.akquise_ergebnis === 'kein_interesse') return 'verloren'
  return 'erstkontakt'
}

type AdminClient = ReturnType<typeof createAdminClient>

interface LeadFields {
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
  sheet_lead_id: string
  last_synced_at: string
}

interface ExistingLeadRow {
  id: string
  lead_number: string
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
  sheet_lead_id: string | null
  client_id: string | null
}

interface ChangeLogCandidate {
  lead_id: string
  field: string
  old_value: string | null
  new_value: string | null
}

// Felder, die der Sync tatsächlich überschreibt (sheet_lead_id/last_synced_at bewusst
// ausgenommen — Match-Key bzw. ändert sich bei jedem Lauf, keine sinnvolle Historie).
const TRACKED_FIELDS: (keyof LeadFields & keyof ExistingLeadRow)[] = [
  'firmenname',
  'ansprechpartner',
  'position',
  'zielgruppe',
  'stadt',
  'website',
  'phone',
  'email',
  'quelle',
  'website_qualitaet',
  'prioritaet',
  'erstkontakt_am',
  'akquise_ergebnis',
  'wiedervorlage',
  'notizen',
  'current_stage',
]

/** Vergleicht den DB-Stand vor dem Sync mit den neuen Sheet-Werten — Grundlage für den
 * Audit-Trail in lead_change_log (siehe Migration 0030). */
function diffLeadFields(leadId: string, oldRow: ExistingLeadRow, newFields: LeadFields): ChangeLogCandidate[] {
  const changes: ChangeLogCandidate[] = []
  for (const field of TRACKED_FIELDS) {
    const oldValue = oldRow[field]
    const newValue = newFields[field]
    if (oldValue !== newValue) {
      changes.push({
        lead_id: leadId,
        field,
        old_value: oldValue == null ? null : String(oldValue),
        new_value: newValue == null ? null : String(newValue),
      })
    }
  }
  return changes
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * Bulk-Upsert mit Row-für-Row-Fallback: schlägt der Bulk-Call fehl (z.B. eine einzelne
 * fehlerhafte Zeile), reißt das nicht den ganzen Batch mit — nur die tatsächlich
 * betroffene Zeile landet in `errors`, der Rest wird trotzdem gespeichert.
 */
async function upsertAllWithFallback<T>(
  rows: T[],
  bulkUpsert: (rows: T[]) => PromiseLike<{ error: { message: string } | null }>,
  rowUpsert: (row: T) => PromiseLike<{ error: { message: string } | null }>,
  errors: string[],
  rowLabel: (row: T) => string
): Promise<number> {
  if (rows.length === 0) return 0
  const { error } = await bulkUpsert(rows)
  if (!error) return rows.length

  let succeeded = 0
  for (const row of rows) {
    const { error: rowError } = await rowUpsert(row)
    if (rowError) {
      errors.push(`${rowLabel(row)}: ${rowError.message}`)
      continue
    }
    succeeded++
  }
  return succeeded
}

const SYNC_LOCK_KEY = 'akquise_sheet_sync'
// Ein echter Sync dauert Sekunden, nicht Minuten — 10 Minuten sind großzügig genug, um
// nach einem Absturz/Timeout (Lock wurde nie freigegeben) automatisch wieder freizuschalten.
const SYNC_LOCK_STALE_MS = 10 * 60 * 1000

/** Gibt true zurück, wenn der Lock erfolgreich übernommen wurde (kein anderer Lauf aktiv). */
async function acquireSyncLock(adminClient: AdminClient): Promise<boolean> {
  const staleCutoff = new Date(Date.now() - SYNC_LOCK_STALE_MS).toISOString()
  await adminClient.from('sync_locks').delete().eq('key', SYNC_LOCK_KEY).lt('locked_at', staleCutoff)

  const { error } = await adminClient.from('sync_locks').insert({ key: SYNC_LOCK_KEY })
  return !error
}

async function releaseSyncLock(adminClient: AdminClient): Promise<void> {
  await adminClient.from('sync_locks').delete().eq('key', SYNC_LOCK_KEY)
}

const MAX_WARNING_LINES = 25

/**
 * Kurzfassung + Detailzeilen für integration_calls.error_message (Feldname historisch,
 * trägt hier auch bei Erfolg eine Zusammenfassung). Damit landen die Sync-Warnungen
 * (nicht zuordenbare Sheet-Werte etc.) dauerhaft irgendwo, statt nur einmalig im Toast
 * aufzutauchen und danach unwiederbringlich zu sein — sichtbar auf /admin/integrationen
 * und als "Letzte Sync-Warnungen" auf /admin/akquise (siehe getLastSyncWarnings unten).
 */
function summarizeResult(result: SyncResult): string {
  const warningLines = [
    ...result.sheetErrors,
    ...result.errors,
    ...result.unmapped.map((u) => `[${u.sheet} Zeile ${u.row}] nicht zuordenbarer Wert "${u.value}"`),
  ]

  const parts = [
    `${result.leadsInserted} neu`,
    `${result.leadsUpdated} aktualisiert (${result.changesLogged} Feld-Änderungen protokolliert)`,
    `${result.leadsSkippedAlreadyClient} übersprungen (bereits Kunde)`,
    `${result.qualiCallsUpserted} Quali-Calls`,
    `${result.salesCallsUpserted} Sales-Calls`,
    `${result.trackingRowsUpserted} Tracking-Zeilen`,
  ]
  const summary = parts.join(', ') + (warningLines.length > 0 ? ` — ${warningLines.length} Warnung(en)` : '')

  if (warningLines.length === 0) return summary

  const shown = warningLines.slice(0, MAX_WARNING_LINES)
  const rest = warningLines.length - shown.length
  const detail = shown.map((line) => `- ${line}`).join('\n') + (rest > 0 ? `\n… und ${rest} weitere` : '')
  return `${summary}\n${detail}`
}

/**
 * Zieht Leads/Quali-Calls/Sales-Calls/Tages-Tracking aus dem Akquise-Google-Sheet und
 * gleicht sie mit der DB ab (wiederholbar, im Gegensatz zum alten Insert-only-Import
 * scripts/import/import-leads.ts). Matching ausschließlich über leads.sheet_lead_id
 * (die Sheet-eigene ID-Spalte, z.B. "L-047") — der einmalige Namens-Fallback für die
 * Altbestand-Leads aus dem ursprünglichen Excel-Import ist entfallen, nachdem die 14
 * nie zugeordneten Altleads am 2026-08-18 gelöscht wurden (bewusste Entscheidung: nur
 * noch Leads aus dem Sheet, kein Merge-Risiko über zufällig gleiche Namen+Zielgruppe mehr).
 *
 * Leads, die bereits per convertLeadToClient() zu einem Kunden wurden (client_id
 * gesetzt), werden nicht mehr aus dem Sheet überschrieben — ab diesem Punkt ist der
 * Lead app-seitig "fertig", unabhängig vom aktuellen Sheet-Stand.
 *
 * Läuft hinter einem Lock (sync_locks) — verhindert, dass ein manueller Klick und der
 * nächtliche Cron sich überlappen und Leads doppelt anlegen.
 */
export async function syncAkquiseFromSheet(): Promise<SyncResult> {
  const adminClient = createAdminClient()

  const acquired = await acquireSyncLock(adminClient)
  if (!acquired) {
    throw new DomainError('Ein Sheet-Sync läuft bereits — bitte kurz warten und erneut versuchen.')
  }

  try {
    const result = await runSync(adminClient)
    await logIntegrationCall('sheets', true, summarizeResult(result))
    return result
  } catch (error) {
    await logIntegrationCall('sheets', false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  } finally {
    await releaseSyncLock(adminClient)
  }
}

async function runSync(adminClient: AdminClient): Promise<SyncResult> {
  const report = newMappingReport()
  const sheetData = await sheets.fetchAkquiseSheetData()

  const leads = parseLeads(sheetData.akquise, report)
  const parsedQualiCalls = parseQualiCalls(sheetData.qualiCalls, report)
  const parsedSalesCalls = parseSalesCalls(sheetData.salesCalls, report)
  const trackingRows = parseTrackingRows(sheetData.tracking, report)

  const errors: string[] = []

  // ── Plausibilitätscheck: die ID-Spalte in Quali-/Sales-Calls kann im Sheet veraltet
  // sein (z.B. wenn im Akquise-Blatt zwischenzeitlich Zeilen verschoben wurden) — ein
  // Match nur über die ID kann dann versehentlich die Daten eines anderen Leads
  // übernehmen. Firmenname aus der jeweiligen Zeile muss daher zum per ID gematchten
  // Akquise-Lead passen, sonst wird die Zeile übersprungen statt falsch zugeordnet. ──

  const firmennameBySourceId = new Map(leads.map((l) => [l.sourceId, l.firmenname]))

  function normalizeName(s: string | null): string {
    return (s ?? '').trim().toLowerCase()
  }

  function filterMismatchedCalls<T extends { sourceLeadId: string; firmenname: string | null; sourceRow: number }>(
    calls: T[],
    sheetLabel: string
  ): T[] {
    return calls.filter((call) => {
      const expectedName = firmennameBySourceId.get(call.sourceLeadId)
      if (expectedName === undefined) {
        errors.push(`${sheetLabel} ${call.sourceLeadId} (Zeile ${call.sourceRow}): kein Lead mit dieser ID im Akquise-Blatt gefunden — übersprungen.`)
        return false
      }
      if (call.firmenname && normalizeName(call.firmenname) !== normalizeName(expectedName)) {
        errors.push(
          `${sheetLabel} ${call.sourceLeadId} (Zeile ${call.sourceRow}): Firmenname "${call.firmenname}" passt nicht zum Lead ` +
            `"${expectedName}" im Akquise-Blatt (ID im Sheet vermutlich veraltet/verrutscht) — übersprungen.`
        )
        return false
      }
      return true
    })
  }

  const qualiCalls = filterMismatchedCalls(parsedQualiCalls, 'Quali-Call')
  const salesCalls = filterMismatchedCalls(parsedSalesCalls, 'Sales-Call')

  const qualiByLead = new Map(qualiCalls.map((c) => [c.sourceLeadId, c]))
  const salesByLead = new Map(salesCalls.map((c) => [c.sourceLeadId, c]))

  const { data: existingLeads, error: existingError } = await adminClient
    .from('leads')
    .select(
      'id, lead_number, firmenname, ansprechpartner, position, zielgruppe, stadt, website, phone, email, quelle, website_qualitaet, prioritaet, erstkontakt_am, akquise_ergebnis, wiedervorlage, notizen, current_stage, sheet_lead_id, client_id'
    )
  if (existingError) throw new DomainError(existingError.message)

  const bySheetId = new Map((existingLeads ?? []).filter((l) => l.sheet_lead_id).map((l) => [l.sheet_lead_id as string, l]))

  const sourceIdToLeadId = new Map<string, string>()
  let leadsSkippedAlreadyClient = 0
  const now = new Date().toISOString()

  // ── Phase 1: reine Berechnung (kein DB-Zugriff) — für jeden Sheet-Lead Match und
  // Zielfelder bestimmen, aufgeteilt in "existiert schon" (Update) vs. "neu" (Insert). ──

  const toUpdate: (LeadFields & { id: string; lead_number: string })[] = []
  const pendingInserts: { lead: ParsedLead; fields: LeadFields }[] = []
  const changeLogCandidates: ChangeLogCandidate[] = []

  for (const lead of leads) {
    const quali = qualiByLead.get(lead.sourceId)
    const sales = salesByLead.get(lead.sourceId)
    const stage = deriveStage(lead, !!quali, !!sales, sales?.sales_ergebnis)

    const fields: LeadFields = {
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
      current_stage: stage,
      sheet_lead_id: lead.sourceId,
      last_synced_at: now,
    }

    const existing = bySheetId.get(lead.sourceId)

    if (existing) {
      sourceIdToLeadId.set(lead.sourceId, existing.id)
      if (existing.client_id) {
        leadsSkippedAlreadyClient++
        continue
      }
      changeLogCandidates.push(...diffLeadFields(existing.id, existing, fields))
      toUpdate.push({ id: existing.id, lead_number: existing.lead_number, ...fields })
      continue
    }

    pendingInserts.push({ lead, fields })
  }

  // ── Phase 2: neue Leads — Nummernvergabe darf parallel laufen (get_next_number ist
  // per Row-Lock atomar, siehe Migration 0002), dann EIN Bulk-Insert statt N Einzel-Inserts. ──

  const insertCandidates = (
    await Promise.all(
      pendingInserts.map(async ({ lead, fields }) => {
        const { data: seq, error: seqError } = await adminClient.rpc('get_next_number', { p_typ: 'L', p_scope: '' })
        if (seqError) {
          errors.push(`Lead ${lead.sourceId} (${lead.firmenname}): Nummernvergabe fehlgeschlagen — ${seqError.message}`)
          return null
        }
        const leadNumber = `L-${String(seq).padStart(3, '0')}`
        return { sourceId: lead.sourceId, firmenname: lead.firmenname, row: { lead_number: leadNumber, ...fields } }
      })
    )
  ).filter((v): v is NonNullable<typeof v> => v !== null)

  let leadsInserted = 0
  if (insertCandidates.length > 0) {
    const { data: insertedRows, error: insertError } = await adminClient
      .from('leads')
      .insert(insertCandidates.map((c) => c.row))
      .select('id, sheet_lead_id')

    if (!insertError && insertedRows) {
      const idBySheetId = new Map(insertedRows.map((r) => [r.sheet_lead_id as string, r.id]))
      for (const c of insertCandidates) {
        const id = idBySheetId.get(c.row.sheet_lead_id)
        if (!id) continue
        sourceIdToLeadId.set(c.sourceId, id)
        leadsInserted++
      }
    } else {
      // Bulk-Insert fehlgeschlagen (z.B. eine einzelne fehlerhafte Zeile) — einzeln
      // nachziehen, damit nicht alle neuen Leads in diesem Lauf verloren gehen.
      for (const c of insertCandidates) {
        const { data: inserted, error } = await adminClient.from('leads').insert(c.row).select('id').single()
        if (error || !inserted) {
          errors.push(`Lead ${c.sourceId} (${c.firmenname}): ${error?.message ?? 'unbekannter Fehler'}`)
          continue
        }
        sourceIdToLeadId.set(c.sourceId, inserted.id)
        leadsInserted++
      }
    }
  }

  // ── Phase 3: bestehende Leads — Bulk-Upsert über die Primary-Key-Spalte "id" (volle,
  // nicht-partielle Unique-Constraint, funktioniert daher direkt mit onConflict) in
  // Chunks von 200, damit eine fehlerhafte Zeile nur ihren Chunk statt alles blockiert. ──

  const UPDATE_CHUNK_SIZE = 200
  const updatedLeadIds = new Set<string>()
  const updateChunks = chunk(toUpdate, UPDATE_CHUNK_SIZE)
  const updateResults = await Promise.all(
    updateChunks.map(async (rowsChunk) => {
      const { error } = await adminClient.from('leads').upsert(rowsChunk, { onConflict: 'id' })
      if (!error) {
        for (const row of rowsChunk) updatedLeadIds.add(row.id)
        return rowsChunk.length
      }

      let succeeded = 0
      for (const row of rowsChunk) {
        const { error: rowError } = await adminClient.from('leads').upsert(row, { onConflict: 'id' })
        if (rowError) {
          errors.push(`Lead ${row.sheet_lead_id} (${row.firmenname}): ${rowError.message}`)
          continue
        }
        updatedLeadIds.add(row.id)
        succeeded++
      }
      return succeeded
    })
  )
  const leadsUpdated = updateResults.reduce((sum, n) => sum + n, 0)

  // Audit-Trail: nur für Leads protokollieren, deren Update tatsächlich durchging.
  let changesLogged = 0
  const loggableChanges = changeLogCandidates.filter((c) => updatedLeadIds.has(c.lead_id))
  for (const rowsChunk of chunk(loggableChanges, 500)) {
    const { error } = await adminClient.from('lead_change_log').insert(rowsChunk)
    if (error) {
      errors.push(`Änderungshistorie (${rowsChunk.length} Einträge): ${error.message}`)
      continue
    }
    changesLogged += rowsChunk.length
  }

  // ── Phase 4: Quali-/Sales-Calls + Tracking — je ein Bulk-Upsert statt Zeile für Zeile. ──

  const qualiRows = qualiCalls
    .map((call) => {
      const leadId = sourceIdToLeadId.get(call.sourceLeadId)
      if (!leadId) {
        errors.push(`Quali-Call für unbekannten Lead ${call.sourceLeadId} (Zeile ${call.sourceRow}) übersprungen.`)
        return null
      }
      return {
        label: `Quali-Call ${call.sourceLeadId} (Zeile ${call.sourceRow})`,
        row: {
          lead_id: leadId,
          quali_call_am: call.quali_call_am,
          quali_ergebnis: call.quali_ergebnis,
          wiedervorlage: call.wiedervorlage,
          bedarf_notizen: call.bedarf_notizen,
        },
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  const qualiCallsUpserted = await upsertAllWithFallback(
    qualiRows,
    (items) => adminClient.from('quali_calls').upsert(items.map((i) => i.row), { onConflict: 'lead_id' }),
    (item) => adminClient.from('quali_calls').upsert(item.row, { onConflict: 'lead_id' }),
    errors,
    (item) => item.label
  )

  const salesRows = salesCalls
    .map((call) => {
      const leadId = sourceIdToLeadId.get(call.sourceLeadId)
      if (!leadId) {
        errors.push(`Sales-Call für unbekannten Lead ${call.sourceLeadId} (Zeile ${call.sourceRow}) übersprungen.`)
        return null
      }
      return {
        label: `Sales-Call ${call.sourceLeadId} (Zeile ${call.sourceRow})`,
        row: {
          lead_id: leadId,
          closing_call_am: call.closing_call_am,
          leistungen: call.leistungen,
          angebotsvolumen: call.angebotsvolumen,
          leistungsbeginn: call.leistungsbeginn,
          sales_ergebnis: call.sales_ergebnis,
          notizen: call.notizen,
        },
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  const salesCallsUpserted = await upsertAllWithFallback(
    salesRows,
    (items) => adminClient.from('sales_calls').upsert(items.map((i) => i.row), { onConflict: 'lead_id' }),
    (item) => adminClient.from('sales_calls').upsert(item.row, { onConflict: 'lead_id' }),
    errors,
    (item) => item.label
  )

  const trackingRowsData = trackingRows.map((row) => ({
    label: `Tracking ${row.datum} (${row.wer}, Zeile ${row.sourceRow})`,
    row: {
      datum: row.datum,
      wer: row.wer,
      waehlversuche: row.waehlversuche,
      gespraeche_empfang: row.gespraeche_empfang,
      gespraeche_entscheider: row.gespraeche_entscheider,
      termine_vereinbart: row.termine_vereinbart,
    },
  }))

  const trackingRowsUpserted = await upsertAllWithFallback(
    trackingRowsData,
    (items) => adminClient.from('akquise_tracking').upsert(items.map((i) => i.row), { onConflict: 'datum,wer' }),
    (item) => adminClient.from('akquise_tracking').upsert(item.row, { onConflict: 'datum,wer' }),
    errors,
    (item) => item.label
  )

  return {
    leadsInserted,
    leadsUpdated,
    leadsSkippedAlreadyClient,
    qualiCallsUpserted,
    salesCallsUpserted,
    trackingRowsUpserted,
    changesLogged,
    unmapped: [
      ...report.unmappedPrioritaet,
      ...report.unmappedAkquiseErgebnis,
      ...report.unmappedQualiErgebnis,
      ...report.unmappedSalesErgebnis,
    ],
    sheetErrors: report.sheetErrors,
    errors,
  }
}
