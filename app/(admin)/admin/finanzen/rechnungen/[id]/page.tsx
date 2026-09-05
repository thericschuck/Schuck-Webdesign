import Link from 'next/link'
import { notFound } from 'next/navigation'
import * as financeDomain from '@/lib/domain/finance'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { ladeEditorDaten } from '../../editor-data'
import { InvoiceEditorShell } from './InvoiceEditorShell'
import { InvoiceActions } from './InvoiceActions'
import {
  LEERE_POSITION,
  LEERER_EMPFAENGER,
  type DocumentEditorState,
  type PositionDraft,
} from '@/components/documents/editor-types'
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

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await assertAdmin()
  const { id } = await params

  const invoice = await financeDomain.getInvoice(id).catch(() => null)
  if (!invoice) notFound()

  const [editorDaten, pdfUrl] = await Promise.all([
    ladeEditorDaten(),
    invoice.pdf_url ? financeDomain.getInvoicePdfUrl(invoice.pdf_url) : Promise.resolve(null),
  ])

  const positionen: PositionDraft[] = invoice.items.map((item) => ({
    art_nr: item.art_nr ?? undefined,
    bezeichnung: item.bezeichnung,
    beschreibung: item.beschreibung ?? '',
    menge: Number(item.menge),
    ep: Number(item.ep),
    epLabel: item.ep_label ?? '',
    betragLabel: item.betrag_label ?? '',
    excludeFromSum: item.exclude_from_sum ?? false,
  }))

  // Eine gestellte Rechnung trägt ihren Empfänger als eingefrorenen Snapshot —
  // der Editor zeigt dann diesen, nicht den (womöglich inzwischen geänderten)
  // Kundendatensatz.
  const hatRecipient = Boolean(invoice.recipient?.name?.trim())

  const initialState: DocumentEditorState = {
    empfaengerModus: hatRecipient ? 'manuell' : 'kunde',
    clientId: invoice.client_id ?? '',
    recipient: { ...LEERER_EMPFAENGER, ...(invoice.recipient ?? {}) },
    projectId: invoice.project_id ?? '',
    serviceDate: invoice.service_date ?? '',
    validUntil: '',
    einleitungstext: invoice.einleitungstext ?? '',
    schlusstext: invoice.schlusstext ?? '',
    positionen: positionen.length > 0 ? positionen : [{ ...LEERE_POSITION }],
  }

  const profile = invoice.client
    ? Array.isArray(invoice.client.profiles)
      ? invoice.client.profiles[0]
      : invoice.client.profiles
    : null
  const empfaengerName = invoice.recipient?.name?.trim()
    ? invoice.recipient.name
    : invoice.client
      ? clientDisplayName(profile?.full_name, invoice.client.contact_name, invoice.client.company_name)
      : 'Ohne Kundendatensatz'

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/finanzen/belege" className="hover:text-gray-600 transition-colors">
          Belege
        </Link>
        <span>/</span>
        <span className="text-gray-700">{invoice.invoice_number ?? 'Entwurf'}</span>
      </nav>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
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
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-50 text-amber-700"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                Testrechnung
              </span>
            )}
            {invoice.is_backfilled && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-50 text-purple-700"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                Nachgetragen
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {empfaengerName}
            {invoice.project?.title ? ` · Projekt: ${invoice.project.title}` : ''}
            {invoice.invoice_date ? ` · Gestellt ${fmtDate(invoice.invoice_date)}` : ''}
          </p>
        </div>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors shrink-0"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Gespeichertes PDF
          </a>
        )}
      </div>

      <InvoiceEditorShell
        invoiceId={invoice.id}
        status={invoice.status}
        nummer={invoice.invoice_number}
        initialState={initialState}
        clients={editorDaten.clients}
        projects={editorDaten.projects}
        articles={editorDaten.articles}
        packages={editorDaten.packages}
        companySettings={editorDaten.companySettings}
      >
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Aktionen
          </h2>
          <InvoiceActions
            invoiceId={invoice.id}
            status={invoice.status}
            totalNet={invoice.total_net}
            isTest={invoice.is_test}
          />
        </section>

        {invoice.credit_notes.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2
              className="text-sm font-semibold text-gray-900 mb-3"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Gutschriften
            </h2>
            <div className="flex flex-col gap-2">
              {invoice.credit_notes.map((cn) => (
                <div key={cn.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm font-mono text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {cn.credit_note_number}
                    </p>
                    {cn.reason && (
                      <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {cn.reason}
                      </p>
                    )}
                  </div>
                  <p
                    className="text-sm text-gray-900 font-medium tabular-nums"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    {cn.total_net.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </InvoiceEditorShell>
    </div>
  )
}
