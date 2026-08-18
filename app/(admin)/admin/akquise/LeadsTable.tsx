import Link from 'next/link'
import { STAGE_LABEL } from './stage-constants'
import type { AkquiseErgebnis, LeadPrioritaet, LeadStage } from '@/types/database'

export interface LeadsTableRow {
  id: string
  lead_number: string
  firmenname: string
  zielgruppe: string | null
  stadt: string | null
  prioritaet: LeadPrioritaet
  akquise_ergebnis: AkquiseErgebnis
  current_stage: LeadStage
  wiedervorlage: string | null
  sheet_lead_id: string | null
  last_synced_at: string | null
}

const PRIORITY_LABEL: Record<LeadPrioritaet, string> = { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' }
const ERGEBNIS_LABEL: Record<AkquiseErgebnis, string> = {
  offen: 'Offen',
  nicht_erreicht: 'Nicht erreicht',
  wiedervorlage: 'Wiedervorlage',
  kein_interesse: 'Kein Interesse',
  qualifiziert: 'Qualifiziert',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

export function LeadsTable({ leads, newLeadIds }: { leads: LeadsTableRow[]; newLeadIds?: Set<string> }) {
  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-10 text-center">
        <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Keine Leads für diese Filter.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {['Firma', 'Zielgruppe', 'Stadt', 'Priorität', 'Ergebnis', 'Stage', 'Wiedervorlage', 'Sync'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {leads.map((lead) => {
            const isDue = !!lead.wiedervorlage && new Date(lead.wiedervorlage) <= new Date()
            return (
              <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/admin/akquise/${lead.id}`} className="text-gray-900 font-medium hover:underline" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {lead.firmenname}
                    </Link>
                    {newLeadIds?.has(lead.id) && (
                      <span className="text-[9px] px-1 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 leading-none">
                        NEU
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono">{lead.lead_number}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {lead.zielgruppe ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {lead.stadt ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {PRIORITY_LABEL[lead.prioritaet]}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {ERGEBNIS_LABEL[lead.akquise_ergebnis]}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {STAGE_LABEL[lead.current_stage]}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {lead.wiedervorlage ? (
                    <span className={isDue ? 'text-red-600 font-medium' : 'text-gray-600'}>{fmtDate(lead.wiedervorlage)}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {lead.sheet_lead_id ? fmtDate(lead.last_synced_at) : 'manuell'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
