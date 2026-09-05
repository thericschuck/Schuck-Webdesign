'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { DomainError } from '@/lib/domain/errors'
import * as financeDomain from '@/lib/domain/finance'
import type { DocumentEditorPayload, SaveResult } from '@/components/documents/editor-types'
import type { InvoiceItemInput } from '@/lib/domain/finance'

/**
 * Server Actions für den Rechnungs-Editor.
 *
 * Bewusst getrennt von `new/actions.ts` und `[id]/actions.ts`: die dortigen
 * Actions arbeiten mit `FormData` und `useActionState` für die alten Formulare.
 * Der Editor übergibt ein typisiertes Objekt, was die JSON-Serialisierung der
 * Positionen überflüssig macht.
 */

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

export async function createInvoiceFromEditorAction(payload: DocumentEditorPayload): Promise<SaveResult> {
  await assertAdmin()
  try {
    const invoice = await financeDomain.createInvoiceDraft({
      clientId: payload.clientId,
      recipient: payload.recipient,
      projectId: payload.projectId,
      serviceDate: payload.serviceDate,
      einleitungstext: payload.einleitungstext,
      schlusstext: payload.schlusstext,
      items: toItems(payload),
    })
    revalidatePath('/admin/finanzen/rechnungen')
    return { status: 'success', id: invoice.id }
  } catch (error) {
    return fehler(error, 'Entwurf konnte nicht erstellt werden.')
  }
}

export async function updateInvoiceFromEditorAction(
  invoiceId: string,
  payload: DocumentEditorPayload
): Promise<SaveResult> {
  await assertAdmin()
  try {
    await financeDomain.updateInvoiceDraft(invoiceId, {
      clientId: payload.clientId,
      recipient: payload.recipient,
      projectId: payload.projectId,
      serviceDate: payload.serviceDate,
      einleitungstext: payload.einleitungstext,
      schlusstext: payload.schlusstext,
      items: toItems(payload),
    })
    revalidatePath(`/admin/finanzen/rechnungen/${invoiceId}`)
    revalidatePath('/admin/finanzen/rechnungen')
    return { status: 'success', id: invoiceId }
  } catch (error) {
    return fehler(error, 'Rechnung konnte nicht gespeichert werden.')
  }
}
