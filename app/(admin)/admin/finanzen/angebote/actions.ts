'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { DomainError } from '@/lib/domain/errors'
import * as offersDomain from '@/lib/domain/offers'
import type { DocumentEditorPayload, SaveResult } from '@/components/documents/editor-types'
import type { InvoiceItemInput } from '@/lib/domain/finance'
import type { OfferStatus } from '@/types/database'

/** Übersetzt die Editor-Positionen in die Domain-Eingabe. */
function toItems(payload: DocumentEditorPayload): InvoiceItemInput[] {
  return payload.positionen.map((p) => ({
    artNr: p.art_nr,
    pktNr: p.pkt_nr,
    bezeichnung: p.bezeichnung.trim() || undefined,
    beschreibung: p.beschreibung,
    menge: p.menge,
    ep: p.ep,
    epLabel: p.epLabel,
    betragLabel: p.betragLabel,
    excludeFromSum: p.excludeFromSum,
  }))
}

function fehler(error: unknown, fallback: string): SaveResult {
  return {
    status: 'error',
    message: error instanceof DomainError ? error.message : error instanceof Error ? error.message : fallback,
  }
}

export async function createOfferDraftAction(payload: DocumentEditorPayload): Promise<SaveResult> {
  await assertAdmin()
  try {
    const offer = await offersDomain.createOfferDraft({
      clientId: payload.clientId,
      recipient: payload.recipient,
      validUntil: payload.validUntil,
      einleitungstext: payload.einleitungstext,
      schlusstext: payload.schlusstext,
      items: toItems(payload),
    })
    revalidatePath('/admin/finanzen/angebote')
    return { status: 'success', id: offer.id }
  } catch (error) {
    return fehler(error, 'Angebot konnte nicht angelegt werden.')
  }
}

export async function updateOfferDraftAction(
  offerId: string,
  payload: DocumentEditorPayload
): Promise<SaveResult> {
  await assertAdmin()
  try {
    await offersDomain.updateOfferDraft(offerId, {
      clientId: payload.clientId,
      recipient: payload.recipient,
      validUntil: payload.validUntil,
      einleitungstext: payload.einleitungstext,
      schlusstext: payload.schlusstext,
      items: toItems(payload),
    })
    revalidatePath(`/admin/finanzen/angebote/${offerId}`)
    revalidatePath('/admin/finanzen/angebote')
    return { status: 'success', id: offerId }
  } catch (error) {
    return fehler(error, 'Angebot konnte nicht gespeichert werden.')
  }
}

export async function issueOfferAction(offerId: string): Promise<SaveResult> {
  await assertAdmin()
  try {
    const offer = await offersDomain.issueOffer(offerId)
    revalidatePath(`/admin/finanzen/angebote/${offerId}`)
    revalidatePath('/admin/finanzen/angebote')
    return { status: 'success', id: offer.offer_number ?? offerId }
  } catch (error) {
    return fehler(error, 'Angebot konnte nicht gestellt werden.')
  }
}

export async function sendOfferAction(offerId: string, to?: string): Promise<SaveResult> {
  await assertAdmin()
  try {
    const result = await offersDomain.sendOffer(offerId, to?.trim() || undefined)
    revalidatePath(`/admin/finanzen/angebote/${offerId}`)
    return { status: 'success', id: result.to }
  } catch (error) {
    return fehler(error, 'Angebot konnte nicht versendet werden.')
  }
}

export async function updateOfferStatusAction(offerId: string, status: OfferStatus): Promise<SaveResult> {
  await assertAdmin()
  try {
    await offersDomain.updateOfferStatus(offerId, status)
    revalidatePath(`/admin/finanzen/angebote/${offerId}`)
    revalidatePath('/admin/finanzen/angebote')
    return { status: 'success' }
  } catch (error) {
    return fehler(error, 'Status konnte nicht geändert werden.')
  }
}

export async function deleteOfferDraftAction(offerId: string): Promise<SaveResult> {
  await assertAdmin()
  try {
    await offersDomain.deleteOfferDraft(offerId)
    revalidatePath('/admin/finanzen/angebote')
    return { status: 'success' }
  } catch (error) {
    return fehler(error, 'Entwurf konnte nicht gelöscht werden.')
  }
}
