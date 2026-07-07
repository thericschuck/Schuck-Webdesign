import { createAdminClient } from '@/lib/supabase/admin'
import { clientDisplayName } from '@/lib/client-name'
import { DomainError } from './errors'

export interface CounterEntry {
  typ: string
  scopeKey: string
  label: string
  lastIssued: string | null
  nextValue: string
}

const TYP_LABEL: Record<string, string> = {
  L: 'Leads',
  KD: 'Kunden',
  PRJ: 'Projekte',
  AN: 'Angebote',
  RE: 'Rechnungen',
  GS: 'Gutschriften',
}

/** Reihenfolge entlang des Geschäftsablaufs (Lead → Kunde → Projekt → Angebot → Rechnung →
 * Gutschrift) statt alphabetisch — unbekannte typ-Werte landen ans Ende. */
const TYP_ORDER = ['L', 'KD', 'PRJ', 'AN', 'RE', 'GS']

/** Muss exakt spiegeln, wie die jeweilige Domain-Funktion die Nummer aus `get_next_number`
 * zusammensetzt (lib/domain/{clients,projects,akquise}.ts, issue_invoice/create_credit_note
 * in schema.sql) — sonst zeigt die Übersicht eine andere Nummer an als tatsächlich vergeben wird. */
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

  const prjScopes = [...new Set((counters ?? []).filter((c) => c.typ === 'PRJ').map((c) => c.scope_key))]
  const clientNameByNumber = new Map<string, string>()
  if (prjScopes.length > 0) {
    const { data: clients } = await adminClient
      .from('clients')
      .select('client_number, company_name, contact_name, profiles(full_name)')
      .in('client_number', prjScopes)
    for (const c of clients ?? []) {
      if (!c.client_number) continue
      const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
      clientNameByNumber.set(c.client_number, clientDisplayName(profile?.full_name, c.contact_name, c.company_name))
    }
  }

  return (counters ?? [])
    .map((c): CounterEntry => {
      const base = TYP_LABEL[c.typ] ?? c.typ
      const label = c.typ === 'PRJ' ? `${base} – ${clientNameByNumber.get(c.scope_key) ?? c.scope_key}` : c.scope_key ? `${base} ${c.scope_key}` : base
      return {
        typ: c.typ,
        scopeKey: c.scope_key,
        label,
        lastIssued: c.last_value > 0 ? formatNumber(c.typ, c.scope_key, c.last_value) : null,
        nextValue: formatNumber(c.typ, c.scope_key, c.last_value + 1),
      }
    })
    .sort((a, b) => {
      const orderIndex = (typ: string) => {
        const i = TYP_ORDER.indexOf(typ)
        return i === -1 ? TYP_ORDER.length : i
      }
      const orderDiff = orderIndex(a.typ) - orderIndex(b.typ)
      return orderDiff !== 0 ? orderDiff : a.scopeKey.localeCompare(b.scopeKey)
    })
}
