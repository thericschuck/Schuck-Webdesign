'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/assert-admin'
import * as financeDomain from '@/lib/domain/finance'

type ActionResult = { status: 'error'; message: string } | { status: 'success' }

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function num(formData: FormData, key: string): number | null {
  const v = str(formData, key)
  if (v === null) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

function revalidateInvoice(invoiceId: string) {
  revalidatePath(`/admin/finanzen/rechnungen/${invoiceId}`)
  revalidatePath('/admin/finanzen/rechnungen')
  revalidatePath('/admin/finanzen')
}

// ── Entwurf bearbeiten ────────────────────────────────────────────────────

export async function issueInvoiceAction(invoiceId: string): Promise<ActionResult> {
  await assertAdmin()

  try {
    await financeDomain.issueInvoice(invoiceId)
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Rechnung konnte nicht gestellt werden.' }
  }

  revalidateInvoice(invoiceId)
  return { status: 'success' }
}

// ── Statuswechsel ─────────────────────────────────────────────────────────

export async function updateInvoiceStatusAction(invoiceId: string, status: 'bezahlt' | 'storniert'): Promise<ActionResult> {
  await assertAdmin()

  try {
    await financeDomain.updateInvoiceStatus(invoiceId, status)
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Status konnte nicht geändert werden.' }
  }

  revalidateInvoice(invoiceId)
  return { status: 'success' }
}

// ── PDF neu erzeugen ──────────────────────────────────────────────────────

export async function regenerateInvoicePdfAction(invoiceId: string): Promise<ActionResult> {
  await assertAdmin()

  try {
    await financeDomain.regenerateInvoicePdf(invoiceId)
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'PDF konnte nicht neu erzeugt werden.' }
  }

  revalidateInvoice(invoiceId)
  return { status: 'success' }
}

// ── Testrechnung löschen ──────────────────────────────────────────────────

export async function deleteTestInvoiceAction(invoiceId: string): Promise<ActionResult> {
  await assertAdmin()

  try {
    await financeDomain.deleteTestInvoice(invoiceId)
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Testrechnung konnte nicht gelöscht werden.' }
  }

  revalidatePath('/admin/finanzen/rechnungen')
  revalidatePath('/admin/finanzen')
  redirect('/admin/finanzen/rechnungen')
}

// ── Gutschrift ────────────────────────────────────────────────────────────

type CreateCreditNoteResult = { status: 'error'; message: string } | { status: 'success'; creditNoteNumber: string }

export async function createCreditNoteAction(
  invoiceId: string,
  _prev: CreateCreditNoteResult | null,
  formData: FormData
): Promise<CreateCreditNoteResult> {
  await assertAdmin()

  const totalNet = num(formData, 'total_net')
  if (!totalNet || totalNet <= 0) return { status: 'error', message: 'Betrag muss größer als 0 sein.' }

  try {
    const creditNote = await financeDomain.createCreditNote({
      invoiceId,
      reason: str(formData, 'reason'),
      totalNet,
    })
    revalidateInvoice(invoiceId)
    return { status: 'success', creditNoteNumber: creditNote.credit_note_number }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Gutschrift konnte nicht erstellt werden.' }
  }
}
