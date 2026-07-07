'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/assert-admin'
import * as productsDomain from '@/lib/domain/products'

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

export async function updatePackageAction(
  pktNr: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await assertAdmin()

  try {
    await productsDomain.updatePackage(pktNr, {
      paketname: str(formData, 'paketname') ?? undefined,
      paketpreis: num(formData, 'paketpreis'),
      zielgruppe: str(formData, 'zielgruppe'),
      laufzeit: str(formData, 'laufzeit'),
      folgeprodukt: str(formData, 'folgeprodukt'),
    })
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Fehler beim Speichern.' }
  }

  revalidatePath('/admin/products/packages')
  revalidatePath(`/admin/products/packages/${pktNr}`)
  return { status: 'success' }
}
