import Link from 'next/link'
import { notFound } from 'next/navigation'
import * as financeDomain from '@/lib/domain/finance'
import * as projectsDomain from '@/lib/domain/projects'
import * as productsDomain from '@/lib/domain/products'
import { InvoiceEditForm } from './InvoiceEditForm'
import { InvoiceActions } from './InvoiceActions'
import { FinanzenTabs } from '../../FinanzenTabs'
import { DocumentPreview } from '@/components/documents/DocumentPreview'
import { ladeDokument } from '@/lib/domain/document-render'
import type { InvoiceStatus } from '@/types/database'
import { clientDisplayName } from '@/lib/client-name'

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  entwurf: 'Entwurf',
  versendet: 'Versendet',
  bezahlt: 'Bezahlt',
  storniert: 'Storniert',
}

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  entwurf: 'bg-gray-100 text-gray-600',
  versendet: 'bg-blue-50 text-blue-700',
  bezahlt: 'bg-green-50 text-green-700',
  storniert: 'bg-red-50 text-red-700',
}

function fmtEuro(value: number | null) {
  return value == null ? '—' : `${value.toLocaleString('de-DE')} €`
}

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const invoice = await financeDomain.getInvoice(id).catch(() => null)
  if (!invoice) notFound()

  const isDraft = invoice.status === 'entwurf'

  const [projects, articles, packages, pdfUrl, dokument] = await Promise.all([
    isDraft ? projectsDomain.listProjects({ clientId: invoice.client_id }) : Promise.resolve([]),
    isDraft ? productsDomain.listArticles().catch(() => []) : Promise.resolve([]),
    isDraft ? productsDomain.listPackages().catch(() => []) : Promise.resolve([]),
    invoice.pdf_url ? financeDomain.getInvoicePdfUrl(invoice.pdf_url) : Promise.resolve(null),
    // Seitengenaue Vorschau desselben Renderers, der auch das PDF erzeugt.
    // Schlägt sie fehl (z.B. fehlende Kundenadresse), bleibt die Seite nutzbar.
    ladeDokument('rechnung', id).catch(() => null),
  ])

  const invoiceClientProfile = invoice.client
    ? Array.isArray(invoice.client.profiles)
      ? invoice.client.profiles[0]
      : invoice.client.profiles
    : null
  const invoiceClientName = invoice.client
    ? clientDisplayName(invoiceClientProfile?.full_name, invoice.client.contact_name, invoice.client.company_name)
    : 'Unbekannter Kunde'

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/finanzen/rechnungen" className="hover:text-gray-600 transition-colors">
          Rechnungen
        </Link>
        <span>/</span>
        <span className="text-gray-700">{invoice.invoice_number ?? 'Entwurf'}</span>
      </nav>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
              {invoice.invoice_number ?? 'Rechnungsentwurf'}
            </h1>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[invoice.status]}`}
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {STATUS_LABEL[invoice.status]}
            </span>
            {invoice.is_test && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-50 text-amber-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Testrechnung
              </span>
            )}
            {invoice.is_backfilled && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-50 text-purple-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Nachgetragen
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {invoiceClientName}
            {invoice.client?.client_number ? ` · ${invoice.client.client_number}` : ''}
            {invoice.project?.title ? ` · Projekt: ${invoice.project.title}` : ''}
          </p>
        </div>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF öffnen
          </a>
        )}
      </div>

      <FinanzenTabs />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {isDraft ? (
              <InvoiceEditForm
                invoiceId={invoice.id}
                initialItems={invoice.items.map((item) => ({
                  art_nr: item.art_nr ?? undefined,
                  bezeichnung: item.bezeichnung,
                  menge: item.menge,
                  ep: item.ep,
                }))}
                packages={(packages ?? []).map((p) => ({
                  pkt_nr: p.pkt_nr,
                  paketname: p.paketname,
                  paketpreis: p.paketpreis,
                }))}
                serviceDate={invoice.service_date}
                projectId={invoice.project_id}
                projects={projects.map((p) => ({ id: p.id, title: p.title, project_number: p.project_number }))}
                articles={(articles ?? []).map((a) => ({
                  art_nr: a.art_nr,
                  bezeichnung: a.bezeichnung,
                  preis_min: a.preis_min,
                  preis_max: a.preis_max,
                }))}
              />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>Rechnungsdatum</p>
                    <p className="text-sm text-gray-900 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>{fmtDate(invoice.invoice_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>Leistungsdatum</p>
                    <p className="text-sm text-gray-900 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>{fmtDate(invoice.service_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>Versendet</p>
                    <p className="text-sm text-gray-900 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>{invoice.sent_at ? fmtDate(invoice.sent_at) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>Bezahlt am</p>
                    <p className="text-sm text-gray-900 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>{invoice.paid_at ? fmtDate(invoice.paid_at) : '—'}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Pos.</th>
                        <th className="py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Bezeichnung</th>
                        <th className="py-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Menge</th>
                        <th className="py-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>EP</th>
                        <th className="py-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Gesamt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoice.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2 text-sm text-gray-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>{item.pos}</td>
                          <td className="py-2 text-sm text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>{item.bezeichnung}</td>
                          <td className="py-2 text-sm text-gray-700 text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>{item.menge}</td>
                          <td className="py-2 text-sm text-gray-700 text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>{fmtEuro(item.ep)}</td>
                          <td className="py-2 text-sm text-gray-900 font-medium text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>{fmtEuro(item.gesamt)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-100">
                        <td colSpan={4} className="py-3 text-sm text-gray-600 text-right font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>Gesamt netto</td>
                        <td className="py-3 text-sm text-gray-900 font-semibold text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>{fmtEuro(invoice.total_net)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {!invoice.ust_pflichtig && (
                  <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    Gemäß § 19 UStG wurde keine Umsatzsteuer berechnet.
                  </p>
                )}
              </div>
            )}
          </div>

          {invoice.credit_notes.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Gutschriften
              </h2>
              <div className="flex flex-col gap-2">
                {invoice.credit_notes.map((cn) => (
                  <div key={cn.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
                    <div>
                      <p className="text-sm text-gray-900 font-mono" style={{ fontFamily: 'var(--font-dm-sans)' }}>{cn.credit_note_number}</p>
                      {cn.reason && <p className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>{cn.reason}</p>}
                    </div>
                    <p className="text-sm text-gray-900 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>{fmtEuro(cn.total_net)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dokument && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2
                className="text-sm font-semibold text-gray-900 mb-4"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                Vorschau
              </h2>
              <DocumentPreview
                data={dokument.data}
                theme={dokument.theme}
                pdfUrl={`/api/admin/documents/pdf?typ=rechnung&id=${invoice.id}`}
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Aktionen
          </h2>
          <InvoiceActions invoiceId={invoice.id} status={invoice.status} totalNet={invoice.total_net} isTest={invoice.is_test} />
        </div>
      </div>
    </div>
  )
}
