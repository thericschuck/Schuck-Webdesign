import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../../.env.local') })

const DRY_RUN = process.argv.includes('--dry-run')
const XLSX_PATH = path.resolve(__dirname, 'Schuck_Webdesign_Produktkatalog.xlsx')

// ── Parsing-Helfer ────────────────────────────────────────────────────────

function toNumber(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') return raw
  const s = String(raw).trim()
  if (!s) return null
  const cleaned = s.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isNaN(n) ? null : n
}

// "1.500" -> {min:1500,max:1500} | "800–1.500" -> {min:800,max:1500} | "ab 6.000" -> {min:6000,max:6000}
function parsePriceRange(raw: unknown): { min: number; max: number } | null {
  if (raw == null) return null
  let s = String(raw).trim()
  if (!s) return null
  s = s.replace(/^ab\s+/i, '')
  const rangeMatch = s.match(/^([\d.,]+)\s*[–-]\s*([\d.,]+)$/)
  if (rangeMatch) {
    const min = toNumber(rangeMatch[1])
    const max = toNumber(rangeMatch[2])
    if (min == null || max == null) return null
    return { min, max }
  }
  const value = toNumber(s)
  return value == null ? null : { min: value, max: value }
}

function parseMenge(raw: unknown): number | null {
  if (raw == null) return null
  const m = String(raw).match(/(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

function cell(row: unknown[], i: number): unknown {
  return row[i]
}

function str(raw: unknown): string | null {
  return raw == null || String(raw).trim() === '' ? null : String(raw).trim()
}

// ── Artikel (Sheet "Produktkatalog") ─────────────────────────────────────

interface ParsedArticle {
  art_nr: string
  bezeichnung: string
  beschreibung: string | null
  preis_min: number | null
  preis_max: number | null
  einheit: string | null
  typ: string | null
  kategorie: string | null
  pflichtbetrieb_raw: string | null
}

function parseArticles(rows: unknown[][]): ParsedArticle[] {
  const headerIdx = rows.findIndex((r) => cell(r, 0) === 'Art-Nr.')
  if (headerIdx === -1) {
    throw new Error('Header-Zeile "Art-Nr." im Produktkatalog-Sheet nicht gefunden.')
  }

  const articles: ParsedArticle[] = []
  for (const row of rows.slice(headerIdx + 1)) {
    const artNr = str(cell(row, 0))
    if (!artNr) continue
    const bezeichnung = str(cell(row, 1))
    if (!bezeichnung) continue // Kategorie-Trennzeile (z.B. "SW – WEBSITE CORE"), kein Artikel

    const priceRange = parsePriceRange(cell(row, 3))
    articles.push({
      art_nr: artNr,
      bezeichnung,
      beschreibung: str(cell(row, 2)),
      preis_min: priceRange?.min ?? null,
      preis_max: priceRange?.max ?? null,
      einheit: str(cell(row, 4)),
      typ: str(cell(row, 5)),
      kategorie: str(cell(row, 6)),
      pflichtbetrieb_raw: str(cell(row, 8)),
    })
  }
  return articles
}

// ── Paketdefinitionen (Sheet "Paket-Definitionen") ───────────────────────

interface ParsedPackageDef {
  pkt_nr: string
  paketname: string
  paketpreis: number | null
  items: { art_nr: string; menge: number }[]
}

function parsePackageDefs(rows: unknown[][]): ParsedPackageDef[] {
  const headerIdx = rows.findIndex((r) => cell(r, 0) === 'PKT-Nr.')
  if (headerIdx === -1) {
    throw new Error('Header-Zeile "PKT-Nr." im Paket-Definitionen-Sheet nicht gefunden.')
  }

  const defs: ParsedPackageDef[] = []
  for (const row of rows.slice(headerIdx + 1)) {
    const pktNr = str(cell(row, 0))
    const paketname = str(cell(row, 1))
    if (!pktNr || !paketname) continue

    const itemsRaw = str(cell(row, 3)) ?? ''
    const items = itemsRaw
      .split('+')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((token) => {
        const m = token.match(/^(.+?)×(\d+)$/)
        return m ? { art_nr: m[1].trim(), menge: parseInt(m[2], 10) } : { art_nr: token, menge: 1 }
      })

    defs.push({ pkt_nr: pktNr, paketname, paketpreis: toNumber(cell(row, 2)), items })
  }
  return defs
}

// ── Paketdetails (Sheet "Pakete Übersicht") ──────────────────────────────

interface UebersichtItem {
  art_nr: string
  pos: number
  menge: number | null
  ep: number | null
  gesamt: number | null
}

interface UebersichtBlock {
  zielgruppe: string | null
  laufzeit: string | null
  folgeprodukt: string | null
  items: UebersichtItem[]
}

function parsePaketeUebersicht(rows: unknown[][]): Map<string, UebersichtBlock> {
  const blocks = new Map<string, UebersichtBlock>()
  let currentPkt: string | null = null

  const titleRe = /^(PKT-\d+)\s*·\s*(.+)$/
  const zielgruppeRe = /^Zielgruppe:\s*(.+)$/i
  const paketpreisRe = /^PAKETPREIS\s+(PKT-\d+)\s*·\s*Laufzeit:\s*(.+)$/i
  const folgeproduktRe = /^→\s*Empfohlenes Folgeprodukt:\s*(.+)$/i
  const artNrRe = /^[A-Z]{2,3}-\d{2,3}(-B)?$/

  for (const row of rows) {
    const first = str(cell(row, 0))
    if (!first) continue

    const titleMatch = first.match(titleRe)
    if (titleMatch) {
      currentPkt = titleMatch[1]
      blocks.set(currentPkt, { zielgruppe: null, laufzeit: null, folgeprodukt: null, items: [] })
      continue
    }
    if (!currentPkt) continue // Sheet-Titel/Untertitel vor dem ersten Paketblock

    const block = blocks.get(currentPkt)!

    const zielgruppeMatch = first.match(zielgruppeRe)
    if (zielgruppeMatch) {
      block.zielgruppe = zielgruppeMatch[1].trim()
      continue
    }

    if (first === 'Art-Nr.' || first === 'Einzelpreise gesamt') continue

    const paketpreisMatch = first.match(paketpreisRe)
    if (paketpreisMatch) {
      block.laufzeit = paketpreisMatch[2].trim()
      continue
    }

    const folgeproduktMatch = first.match(folgeproduktRe)
    if (folgeproduktMatch) {
      block.folgeprodukt = folgeproduktMatch[1].trim()
      continue
    }

    if (artNrRe.test(first) && typeof cell(row, 1) === 'number') {
      block.items.push({
        art_nr: first,
        pos: cell(row, 1) as number,
        menge: parseMenge(cell(row, 3)),
        ep: toNumber(cell(row, 4)),
        gesamt: toNumber(cell(row, 5)),
      })
    }
  }

  return blocks
}

// ── Sheet-Lookup (robust gegen Encoding-Abweichungen bei Umlauten) ───────

function findSheet(workbook: XLSX.WorkBook, needle: string): string {
  const name = workbook.SheetNames.find((n) => n.toLowerCase().includes(needle.toLowerCase()))
  if (!name) {
    throw new Error(`Sheet mit "${needle}" nicht gefunden. Vorhanden: ${workbook.SheetNames.join(', ')}`)
  }
  return name
}

function sheetRows(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: null,
    raw: true,
  })
}

// ── Prüfsummen ────────────────────────────────────────────────────────────

function printChecksums(
  articles: { kategorie: string | null }[],
  packages: unknown[],
  items: unknown[],
  warnings: string[]
) {
  console.log('\n── Prüfsummen ──')
  const byKategorie = new Map<string, number>()
  for (const a of articles) {
    const key = a.kategorie ?? '(ohne Kategorie)'
    byKategorie.set(key, (byKategorie.get(key) ?? 0) + 1)
  }
  for (const [kategorie, count] of [...byKategorie.entries()].sort()) {
    console.log(`  ${kategorie}: ${count}`)
  }
  console.log(`  Artikel gesamt: ${articles.length}`)
  console.log(`  Pakete: ${packages.length}`)
  console.log(`  Paketpositionen: ${items.length}`)

  if (warnings.length > 0) {
    console.log('\n── Warnungen ──')
    for (const w of warnings) console.log(`  ${w}`)
  }
}

// ── Hauptlauf ─────────────────────────────────────────────────────────────

async function run() {
  const workbook = XLSX.readFile(XLSX_PATH)

  const articles = parseArticles(sheetRows(workbook, findSheet(workbook, 'Produktkatalog')))
  const packageDefs = parsePackageDefs(sheetRows(workbook, findSheet(workbook, 'Paket-Definitionen')))
  const uebersichtBlocks = parsePaketeUebersicht(sheetRows(workbook, findSheet(workbook, 'bersicht')))

  const artNrSet = new Set(articles.map((a) => a.art_nr))
  const warnings: string[] = []

  // Artikel ohne pflichtbetrieb_art_nr (Pass 1 – verhindert FK-Vorwärtsreferenzen beim Insert)
  const articlesToUpsert = articles.map((a) => ({
    art_nr: a.art_nr,
    bezeichnung: a.bezeichnung,
    beschreibung: a.beschreibung,
    preis_min: a.preis_min,
    preis_max: a.preis_max,
    einheit: a.einheit,
    typ: a.typ,
    kategorie: a.kategorie,
  }))

  // Pflichtbetrieb-Referenzen für Pass 2 auflösen. Das Schema erlaubt nur EINE
  // Referenz pro Artikel; bei "EX-01-B + EX-03-B" wird nur die erste gespeichert.
  const pflichtbetriebUpdates: { art_nr: string; pflichtbetrieb_art_nr: string }[] = []
  for (const a of articles) {
    if (!a.pflichtbetrieb_raw || a.pflichtbetrieb_raw === '–' || a.pflichtbetrieb_raw === '-') continue
    const tokens = a.pflichtbetrieb_raw.split('+').map((t) => t.trim()).filter(Boolean)
    const [primary, ...rest] = tokens
    if (!primary || !artNrSet.has(primary)) {
      warnings.push(`Pflichtbetrieb-Referenz "${primary}" von ${a.art_nr} ist kein bekannter Artikel — übersprungen.`)
      continue
    }
    pflichtbetriebUpdates.push({ art_nr: a.art_nr, pflichtbetrieb_art_nr: primary })
    if (rest.length > 0) {
      warnings.push(
        `${a.art_nr} erfordert zusätzlich ${rest.join(', ')} — Schema unterstützt nur eine Pflichtbetrieb-Referenz je Artikel, nur "${primary}" gespeichert.`
      )
    }
  }

  // Pakete + Paketpositionen zusammenführen (Paket-Definitionen = Stammdaten, Pakete Übersicht = Details)
  const packagesToUpsert: { pkt_nr: string; paketname: string; paketpreis: number | null; zielgruppe: string | null; laufzeit: string | null; folgeprodukt: string | null }[] = []
  const packageItemsToUpsert: { pkt_nr: string; art_nr: string; pos: number; menge: number | null; ep: number | null; gesamt: number | null }[] = []

  for (const def of packageDefs) {
    const missing = def.items.filter((i) => !artNrSet.has(i.art_nr))
    if (missing.length > 0) {
      warnings.push(
        `${def.pkt_nr} (${def.paketname}) übersprungen — referenziert unbekannte Artikel: ${missing.map((i) => i.art_nr).join(', ')}`
      )
      continue
    }

    const block = uebersichtBlocks.get(def.pkt_nr)
    if (!block) {
      warnings.push(
        `${def.pkt_nr} (${def.paketname}) hat keinen Eintrag in "Pakete Übersicht" — zielgruppe/laufzeit/folgeprodukt bleiben leer, Positionspreise unbekannt.`
      )
    }

    packagesToUpsert.push({
      pkt_nr: def.pkt_nr,
      paketname: def.paketname,
      paketpreis: def.paketpreis,
      zielgruppe: block?.zielgruppe ?? null,
      laufzeit: block?.laufzeit ?? null,
      folgeprodukt: block?.folgeprodukt ?? null,
    })

    const items =
      block && block.items.length > 0
        ? block.items
        : def.items.map((it, idx) => ({ art_nr: it.art_nr, pos: idx + 1, menge: it.menge, ep: null, gesamt: null }))

    for (const item of items) {
      packageItemsToUpsert.push({
        pkt_nr: def.pkt_nr,
        art_nr: item.art_nr,
        pos: item.pos,
        menge: item.menge,
        ep: item.ep,
        gesamt: item.gesamt,
      })
    }
  }

  console.log(
    `Geparst: ${articlesToUpsert.length} Artikel, ${packagesToUpsert.length} Pakete, ${packageItemsToUpsert.length} Paketpositionen.`
  )

  if (DRY_RUN) {
    console.log('\n[--dry-run] Es wird nichts in Supabase geschrieben.')
    printChecksums(articlesToUpsert, packagesToUpsert, packageItemsToUpsert, warnings)
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

  const { error: articlesError } = await supabase
    .from('articles')
    .upsert(articlesToUpsert, { onConflict: 'art_nr' })
  if (articlesError) throw new Error(`Artikel-Import fehlgeschlagen: ${articlesError.message}`)

  for (const update of pflichtbetriebUpdates) {
    const { error } = await supabase
      .from('articles')
      .update({ pflichtbetrieb_art_nr: update.pflichtbetrieb_art_nr })
      .eq('art_nr', update.art_nr)
    if (error) {
      warnings.push(`Pflichtbetrieb-Update für ${update.art_nr} fehlgeschlagen: ${error.message}`)
    }
  }

  const { error: packagesError } = await supabase
    .from('packages')
    .upsert(packagesToUpsert, { onConflict: 'pkt_nr' })
  if (packagesError) throw new Error(`Paket-Import fehlgeschlagen: ${packagesError.message}`)

  const { error: itemsError } = await supabase
    .from('package_items')
    .upsert(packageItemsToUpsert, { onConflict: 'pkt_nr,art_nr' })
  if (itemsError) throw new Error(`Paketpositionen-Import fehlgeschlagen: ${itemsError.message}`)

  printChecksums(articlesToUpsert, packagesToUpsert, packageItemsToUpsert, warnings)
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
