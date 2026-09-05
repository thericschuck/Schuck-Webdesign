import Link from 'next/link'
import { notFound } from 'next/navigation'
import { assertAdmin } from '@/lib/auth/assert-admin'
import * as offersDomain from '@/lib/domain/offers'
import { ladeEditorDaten } from '../../editor-data'
import { OfferEditorShell } from './OfferEditorShell'
import {
  LEERE_POSITION,
  LEERER_EMPFAENGER,
  type DocumentEditorState,
  type PositionDraft,
} from '@/components/documents/editor-types'
import type { OfferStatus } from '@/types/database'

const STATUS_LABEL: Record<OfferStatus, string> = {
  entwurf: 'Entwurf',
  gesendet: 'Gesendet',
  angenommen: 'Angenommen',
  abgelehnt: 'Abgelehnt',
}

const STATUS_PILL: Record<OfferStatus, string> = {
  entwurf: 'bg-gray-100 text-gray-600',
  gesendet: 'bg-blue-50 text-blue-700',
  angenommen: 'bg-green-50 text-green-700',
  abgelehnt: 'bg-red-50 text-red-700',
}

function einzel<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export default async function AngebotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await assertAdmin()
  const { id } = await params

  const offer = await offersDomain.getOffer(id).catch(() => null)
  if (!offer) notFound()

  const { clients, projects, articles, packages, companySettings } = await ladeEditorDaten()

  const positionen: PositionDraft[] = offer.items.map((item) => ({
    art_nr: item.art_nr ?? undefined,
    bezeichnung: item.bezeichnung,
    beschreibung: item.beschreibung ?? '',
    menge: Number(item.menge),
    ep: Number(item.ep),
    epLabel: item.ep_label ?? '',
    betragLabel: item.betrag_label ?? '',
    excludeFromSum: item.exclude_from_sum ?? false,
  }))

  // Ein Angebot mit eingetragenem Empfänger startet im Manuell-Modus, eines mit
  // Kundenreferenz im Kundenmodus — der Editor zeigt so genau die Quelle, aus
  // der die Anschrift im Dokument tatsächlich stammt.
  const hatRecipient = Boolean(offer.recipient?.name?.trim())

  const initialState: DocumentEditorState = {
    empfaengerModus: hatRecipient ? 'manuell' : 'kunde',
    clientId: offer.client_id ?? '',
    recipient: { ...LEERER_EMPFAENGER, ...(offer.recipient ?? {}) },
    projectId: '',
    serviceDate: '',
    validUntil: offer.valid_until ?? '',
    einleitungstext: offer.einleitungstext ?? '',
    schlusstext: offer.schlusstext ?? '',
    positionen: positionen.length > 0 ? positionen : [{ ...LEERE_POSITION }],
  }

  const profile = offer.client ? einzel(offer.client.profiles) : null
  const standardEmail =
    profile?.email ?? offer.client?.contact_email ?? offer.recipient?.email ?? offer.lead?.email ?? null

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/finanzen/belege" className="hover:text-gray-600 transition-colors">
          Belege
        </Link>
        <span>/</span>
        <span className="text-gray-700">{offer.offer_number ?? 'Entwurf'}</span>
      </nav>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
              {offer.offer_number ?? 'Angebotsentwurf'}
            </h1>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_PILL[offer.status]}`}
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {STATUS_LABEL[offer.status]}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {offer.status === 'entwurf'
              ? 'Änderungen wirken sofort in der Vorschau rechts.'
              : 'Festgeschrieben — Nummer vergeben, Inhalt nicht mehr änderbar.'}
          </p>
        </div>
      </div>

      <OfferEditorShell
        offerId={offer.id}
        status={offer.status}
        nummer={offer.offer_number}
        initialState={initialState}
        clients={clients}
        projects={projects}
        articles={articles}
        packages={packages}
        companySettings={companySettings}
        standardEmail={standardEmail}
      />
    </div>
  )
}
