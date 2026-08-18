'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/assert-admin'
import * as financeDomain from '@/lib/domain/finance'

type ActionResult = { status: 'error'; message: string } | null

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

interface ItemFormValue {
  art_nr?: string
  pkt_nr?: string
  bezeichnung?: string
  menge?: number
  ep: number
}

export async function createBackfilledInvoiceAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await assertAdmin()

  const clientId = str(formData, 'client_id')
  if (!clientId) return { status: 'error', message: 'Kunde ist erforderlich.' }

  const invoiceNumber = str(formData, 'invoice_number')
  if (!invoiceNumber) return { status: 'error', message: 'Die ursprüngliche Rechnungsnummer ist erforderlich.' }

  const invoiceDate = str(formData, 'invoice_date')
  if (!invoiceDate) return { status: 'error', message: 'Rechnungsdatum ist erforderlich.' }

  const status = str(formData, 'status')
  if (status !== 'versendet' && status !== 'bezahlt') return { status: 'error', message: 'Ungültiger Status.' }

  const itemsRaw = str(formData, 'items_json')
  if (!itemsRaw) return { status: 'error', message: 'Mindestens eine Position ist erforderlich.' }

  let items: ItemFormValue[]
  try {
    items = JSON.parse(itemsRaw)
  } catch {
    return { status: 'error', message: 'Positionen konnten nicht gelesen werden.' }
  }

  const pdfFile = formData.get('pdf_file')
  let uploadedPdf: { bytes: Uint8Array; contentType: string } | null = null
  if (pdfFile instanceof File && pdfFile.size > 0) {
    if (pdfFile.type !== 'application/pdf') return { status: 'error', message: 'Die hochgeladene Datei muss ein PDF sein.' }
    uploadedPdf = { bytes: new Uint8Array(await pdfFile.arrayBuffer()), contentType: pdfFile.type }
  }

  let invoiceId: string
  try {
    const invoice = await financeDomain.createBackfilledInvoice({
      clientId,
      projectId: str(formData, 'project_id'),
      invoiceNumber,
      invoiceDate,
      serviceDate: str(formData, 'service_date'),
      status,
      paidAt: str(formData, 'paid_at'),
      ustPflichtig: formData.get('ust_pflichtig') === 'on',
      items: items.map((item) => ({
        artNr: item.art_nr,
        pktNr: item.pkt_nr,
        bezeichnung: item.bezeichnung,
        menge: item.menge,
        ep: item.ep,
      })),
      uploadedPdf,
      generatePdf: formData.get('generate_pdf') === 'on',
    })
    invoiceId = invoice.id
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Rechnung konnte nicht nachgetragen werden.' }
  }

  revalidatePath('/admin/finanzen/rechnungen')
  revalidatePath('/admin/finanzen')
  redirect(`/admin/finanzen/rechnungen/${invoiceId}`)
}
