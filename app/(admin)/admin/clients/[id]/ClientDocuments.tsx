'use client'

import { DocumentGenerator, type DocRow, type OfferOption } from '@/components/admin/DocumentGenerator'
import { generateClientDocumentAction, sendClientDocumentAction } from './actions'

export function ClientDocuments({
  clientId,
  clientEmail,
  offers,
  documents,
}: {
  clientId: string
  clientEmail: string | null
  offers: OfferOption[]
  documents: DocRow[]
}) {
  return (
    <DocumentGenerator
      clientEmail={clientEmail}
      offers={offers}
      documents={documents}
      onGenerate={(template, offerId) => generateClientDocumentAction(clientId, template, offerId)}
      onSend={(documentId, to, subject) => sendClientDocumentAction(clientId, documentId, to, subject)}
    />
  )
}
