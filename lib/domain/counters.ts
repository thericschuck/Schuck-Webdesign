import { createAdminClient } from '@/lib/supabase/admin'
import { DomainError } from './errors'

export interface CounterEntry {
  key: string
  label: string
  primary: string
  secondary: string | null
  /** Kurzer Erklärtext fürs (i)-Tooltip — was für ein Format/welche Logik steckt dahinter. */
  info: string
}

const TYP_LABEL: Record<string, string> = {
  L: 'Leads',
  KD: 'Kunden',
  PRJ: 'Projekte',
  AN: 'Angebote',
  RE: 'Rechnungen',
  GS: 'Gutschriften',
  TEST: 'Testrechnungen',
}

/** Reihenfolge entlang des Geschäftsablaufs (Lead → Kunde → Projekt → Angebot → Rechnung →
 * Gutschrift) statt alphabetisch — unbekannte typ-Werte landen ans Ende. TEST läuft bewusst
 * außerhalb des echten Geschäftsablaufs, daher ganz hinten. */
const TYP_ORDER = ['L', 'KD', 'PRJ', 'AN', 'RE', 'GS', 'TEST']

const TYP_INFO: Record<string, string> = {
  L: 'Fortlaufend über alle Leads hinweg, Format L-Nummer.',
  KD: 'Fortlaufend über alle Kunden hinweg, Format KD-Nummer.',
  PRJ: 'Jeder Kunde hat seine eigene Zählung: PRJ-Kundennummer-Nummer, z.B. PRJ-004-002 für den zweiten Projekt des Kunden KD-004.',
  AN: 'Beginnt jedes Jahr neu bei 1, Format AN-Jahr-Nummer.',
  RE: 'Jeder Kunde hat pro Jahr seine eigene Zählung: RE-Jahr-KundennummerLfdNr, z.B. RE-2026-00201 für die erste Rechnung des Kunden KD-002 in 2026.',
  GS: 'Beginnt jedes Jahr neu bei 1, Format GS-Jahr-Nummer.',
  TEST: 'Eigener Nummernkreis für Testrechnungen, beginnt jedes Jahr neu bei 1, Format TEST-Jahr-Nummer. Läuft komplett getrennt von der echten RE-Kette.',
}

/** Muss exakt spiegeln, wie die jeweilige Domain-Funktion die Nummer aus `get_next_number`
 * zusammensetzt (lib/domain/{clients,projects,akquise}.ts, issue_invoice/create_credit_note
 * in schema.sql) — sonst zeigt die Übersicht eine andere Nummer an als tatsächlich vergeben wird.
 * RE läuft seit Migration 0023/0025 nicht mehr hierüber — siehe die eigene Aggregation in
 * listCounters(), analog zu PRJ. */
function formatNumber(typ: string, scopeKey: string, value: number): string {
  const padded = String(value).padStart(3, '0')
  if (typ === 'PRJ') return `PRJ-${scopeKey.replace(/^KD-/, '')}-${padded}`
  if (scopeKey) return `${typ}-${scopeKey}-${padded}`
  return `${typ}-${padded}`
}

export async function listCounters(): Promise<CounterEntry[]> {
  const adminClient = createAdminClient()
  const { data: counters, error } = await adminClient.from('counters').select('typ, scope_key, last_value')
  if (error) throw new DomainError(error.message)

  const byTyp = new Map<string, { scopeKey: string; lastValue: number }[]>()
  for (const c of counters ?? []) {
    if (!byTyp.has(c.typ)) byTyp.set(c.typ, [])
    byTyp.get(c.typ)!.push({ scopeKey: c.scope_key, lastValue: c.last_value })
  }

  const entries: CounterEntry[] = []
  for (const [typ, rows] of byTyp) {
    const label = TYP_LABEL[typ] ?? typ
    const info = TYP_INFO[typ] ?? 'Fortlaufender Nummernkreis.'

    if (typ === 'PRJ') {
      // Projekte laufen pro Kunde getrennt — statt einer Kachel je Kunde eine einzige
      // aggregierte Kachel, die Details erklärt das (i)-Tooltip.
      const total = rows.reduce((sum, r) => sum + r.lastValue, 0)
      const clientCount = rows.filter((r) => r.lastValue > 0).length
      entries.push({
        key: typ,
        label,
        primary: `${total} vergeben`,
        secondary: clientCount > 0 ? `über ${clientCount} ${clientCount === 1 ? 'Kunde' : 'Kunden'}` : null,
        info,
      })
      continue
    }

    if (typ === 'RE') {
      // Rechnungen laufen seit Migration 0023 pro Kunde UND Jahr getrennt
      // (scope_key = "<Kundenziffern>-<Jahr>", siehe issue_invoice()) — eine Kachel pro
      // Kunde+Jahr würde mit jedem neuen Kunden weiter wachsen. Stattdessen wie bei PRJ:
      // eine aggregierte Kachel pro Jahr (Summe über alle Kunden).
      const byYear = new Map<string, { total: number; clients: Set<string> }>()
      for (const row of rows) {
        const [clientDigits, year] = row.scopeKey.split('-')
        if (!year) continue // unerwartetes/veraltetes scope_key-Format — überspringen statt crashen
        if (!byYear.has(year)) byYear.set(year, { total: 0, clients: new Set() })
        const bucket = byYear.get(year)!
        bucket.total += row.lastValue
        if (row.lastValue > 0) bucket.clients.add(clientDigits)
      }
      for (const [year, { total, clients }] of [...byYear.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
        entries.push({
          key: `${typ}:${year}`,
          label: `${label} ${year}`,
          primary: `${total} vergeben`,
          secondary: clients.size > 0 ? `über ${clients.size} ${clients.size === 1 ? 'Kunde' : 'Kunden'}` : null,
          info,
        })
      }
      continue
    }

    for (const row of rows) {
      entries.push({
        key: `${typ}:${row.scopeKey}`,
        label: row.scopeKey ? `${label} ${row.scopeKey}` : label,
        primary: row.lastValue > 0 ? formatNumber(typ, row.scopeKey, row.lastValue) : '—',
        secondary: `Nächste: ${formatNumber(typ, row.scopeKey, row.lastValue + 1)}`,
        info,
      })
    }
  }

  return entries.sort((a, b) => {
    const orderIndex = (key: string) => {
      const typ = key.split(':')[0]
      const i = TYP_ORDER.indexOf(typ)
      return i === -1 ? TYP_ORDER.length : i
    }
    const diff = orderIndex(a.key) - orderIndex(b.key)
    return diff !== 0 ? diff : a.label.localeCompare(b.label)
  })
}
