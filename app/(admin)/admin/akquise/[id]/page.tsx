import Link from 'next/link'
import { notFound } from 'next/navigation'
import * as akquiseDomain from '@/lib/domain/akquise'
import * as productsDomain from '@/lib/domain/products'
import { LeadEditForm } from './LeadEditForm'
import { AddCallForm } from './AddCallForm'
import { ConvertToClientForm } from './ConvertToClientForm'
import { CreateOfferForm } from './CreateOfferForm'
import { OfferDocumentActions } from './OfferDocumentActions'
import { ChangeLogList } from './ChangeLogList'
import { STAGE_LABEL } from '../stage-constants'
import { createClient } from '@/lib/supabase/server'
import type { LeadStage } from '@/types/database'

const STAGE_COLOR: Record<LeadStage, string> = {
  erstkontakt: 'bg-gray-100 text-gray-600',
  quali_call: 'bg-blue-50 text-blue-700',
  closing_call: 'bg-amber-50 text-amber-700',
  gewonnen: 'bg-green-50 text-green-700',
  verloren: 'bg-red-50 text-red-700',
}

const OFFER_STATUS_LABEL: Record<string, string> = {
  entwurf: 'Entwurf',
  gesendet: 'Gesendet',
  angenommen: 'Angenommen',
  abgelehnt: 'Abgelehnt',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let lead
  try {
    lead = await akquiseDomain.getLead(id)
  } catch {
    notFound()
  }

  const articles = await productsDomain.listArticles().catch(() => [])
  const changeLog = lead.sheet_lead_id ? await akquiseDomain.getLeadChangeLog(lead.id).catch(() => []) : []

  let clientEmail: string | null = null
  if (lead.client_id) {
    const supabase = await createClient()
    const { data: clientRow } = await supabase.from('clients').select('profiles(email)').eq('id', lead.client_id).single()
    const clientProfile = clientRow ? (Array.isArray(clientRow.profiles) ? clientRow.profiles[0] : clientRow.profiles) : null
    clientEmail = clientProfile?.email ?? null
  }

  // Funnel-Historie: Quali- und Sales-Calls chronologisch zusammenführen
  type TimelineEntry =
    | { type: 'quali'; date: string | null; data: (typeof lead.quali_calls)[number] }
    | { type: 'sales'; date: string | null; data: (typeof lead.sales_calls)[number] }

  const timeline: TimelineEntry[] = [
    ...lead.quali_calls.map((c) => ({ type: 'quali' as const, date: c.quali_call_am ?? c.created_at, data: c })),
    ...lead.sales_calls.map((c) => ({ type: 'sales' as const, date: c.closing_call_am ?? c.created_at, data: c })),
  ].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/akquise" className="hover:text-gray-600 transition-colors">
          Akquise
        </Link>
        <span>/</span>
        <span className="text-gray-700">{lead.firmenname}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {lead.lead_number}
            </span>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
              {lead.firmenname}
            </h1>
          </div>
          {lead.client_id && (
            <Link
              href={`/admin/clients/${lead.client_id}`}
              className="text-sm text-green-700 hover:underline mt-1 inline-block"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              ✓ Bereits Kunde — Kundenprofil ansehen →
            </Link>
          )}
        </div>
        <span
          className={`text-sm px-3 py-1.5 rounded-full font-medium self-start ${STAGE_COLOR[lead.current_stage]}`}
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {STAGE_LABEL[lead.current_stage]}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Left column */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Lead-Daten
            </h2>
            <LeadEditForm lead={lead} />
          </div>

          {lead.sheet_lead_id && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <details>
                <summary
                  className="text-sm font-semibold text-gray-900 cursor-pointer select-none"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  Änderungshistorie {changeLog.length > 0 && `(${changeLog.length})`}
                </summary>
                <div className="mt-4">
                  <ChangeLogList entries={changeLog} />
                </div>
              </details>
            </div>
          )}

          {!lead.client_id && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                In Kunde umwandeln
              </h2>
              <ConvertToClientForm leadId={lead.id} firmenname={lead.firmenname} suggestedEmail={lead.email} />
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="md:col-span-2 flex flex-col gap-4">
          {/* Aktionen */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Call erfassen
            </h2>
            <AddCallForm leadId={lead.id} isFromSheet={!!lead.sheet_lead_id} />
          </div>

          {/* Funnel-Historie */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Funnel-Historie
            </h2>
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Noch keine Calls erfasst.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {timeline.map((entry, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${
                          entry.type === 'quali' ? 'bg-blue-500' : 'bg-amber-500'
                        }`}
                      />
                      {i < timeline.length - 1 && <span className="w-px flex-1 bg-gray-100 mt-1" />}
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            entry.type === 'quali' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                          }`}
                          style={{ fontFamily: 'var(--font-dm-sans)' }}
                        >
                          {entry.type === 'quali' ? 'Quali-Call' : 'Sales-Call'}
                        </span>
                        <span className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {fmtDate(entry.date)}
                        </span>
                        <span className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {entry.type === 'quali'
                            ? `Ergebnis: ${entry.data.quali_ergebnis}`
                            : `Ergebnis: ${entry.data.sales_ergebnis}`}
                        </span>
                      </div>
                      {entry.type === 'quali' && entry.data.bedarf_notizen && (
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {entry.data.bedarf_notizen}
                        </p>
                      )}
                      {entry.type === 'sales' && (
                        <div className="mt-1 text-sm text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {entry.data.leistungen && <p className="whitespace-pre-wrap">{entry.data.leistungen}</p>}
                          {entry.data.angebotsvolumen != null && (
                            <p className="text-gray-500 text-xs mt-1">Volumen: {entry.data.angebotsvolumen} €</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Angebote */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Angebote {lead.offers.length > 0 && `(${lead.offers.length})`}
            </h2>
            {lead.offers.length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                {lead.offers.map((offer) => (
                  <div
                    key={offer.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl border border-gray-100 bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {offer.offer_number}
                      </p>
                      <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {fmtDate(offer.created_at)}
                        {offer.valid_until ? ` · gültig bis ${fmtDate(offer.valid_until)}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {offer.total_net?.toFixed(2) ?? '—'} €
                        </p>
                        <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {OFFER_STATUS_LABEL[offer.status] ?? offer.status}
                        </p>
                      </div>
                      <OfferDocumentActions
                        leadId={lead.id}
                        offerId={offer.id}
                        clientId={lead.client_id}
                        clientEmail={clientEmail}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <details>
              <summary
                className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                + Neues Angebot erstellen
              </summary>
              <div className="mt-4">
                <CreateOfferForm leadId={lead.id} articles={articles} />
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}
