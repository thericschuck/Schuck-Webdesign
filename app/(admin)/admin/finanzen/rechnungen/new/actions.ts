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
  bezeichnung?: string
  menge?: number
  ep: number
}

export async function createInvoiceDraftAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await assertAdmin()

  const clientId = str(formData, 'client_id')
  if (!clientId) return { status: 'error', message: 'Kunde ist erforderlich.' }

  const itemsRaw = str(formData, 'items_json')
  if (!itemsRaw) return { status: 'error', message: 'Mindestens eine Position ist erforderlich.' }

  let items: ItemFormValue[]
  try {
    items = JSON.parse(itemsRaw)
  } catch {
    return { status: 'error', message: 'Positionen konnten nicht gelesen werden.' }
  }

  let invoiceId: string
  try {
    const invoice = await financeDomain.createInvoiceDraft({
      clientId,
      projectId: str(formData, 'project_id'),
      serviceDate: str(formData, 'service_date'),
      items: items.map((item) => ({
        artNr: item.art_nr,
        bezeichnung: item.bezeichnung,
        menge: item.menge,
        ep: item.ep,
      })),
    })
    invoiceId = invoice.id
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Entwurf konnte nicht erstellt werden.' }
  }

  revalidatePath('/admin/finanzen/rechnungen')
  redirect(`/admin/finanzen/rechnungen/${invoiceId}`)
}
