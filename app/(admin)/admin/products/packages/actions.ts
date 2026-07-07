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

// ── Neues Paket anlegen ───────────────────────────────────────────────────

type CreatePackageResult = { status: 'error'; message: string } | { status: 'success'; pktNr: string }

export async function createPackageAction(
  _prev: CreatePackageResult | null,
  formData: FormData
): Promise<CreatePackageResult> {
  await assertAdmin()

  const pktNr = str(formData, 'pkt_nr')
  const paketname = str(formData, 'paketname')
  if (!pktNr) return { status: 'error', message: 'Pkt-Nr. ist erforderlich.' }
  if (!paketname) return { status: 'error', message: 'Paketname ist erforderlich.' }

  try {
    const pkg = await productsDomain.createPackage({
      pktNr,
      paketname,
      paketpreis: num(formData, 'paketpreis'),
      zielgruppe: str(formData, 'zielgruppe'),
      laufzeit: str(formData, 'laufzeit'),
    })
    revalidatePath('/admin/products/packages')
    return { status: 'success', pktNr: pkg.pkt_nr }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Fehler beim Anlegen.' }
  }
}

// ── Positionen (package_items) ────────────────────────────────────────────

export async function addPackageItemAction(
  pktNr: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await assertAdmin()

  const artNr = str(formData, 'art_nr')
  if (!artNr) return { status: 'error', message: 'Artikel ist erforderlich.' }
  const menge = num(formData, 'menge') ?? 1

  try {
    await productsDomain.addPackageItem(pktNr, artNr, { menge, ep: num(formData, 'ep') })
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Fehler beim Hinzufügen.' }
  }

  revalidatePath(`/admin/products/packages/${pktNr}`)
  revalidatePath('/admin/products/packages')
  return { status: 'success' }
}

export async function updatePackageItemAction(
  pktNr: string,
  artNr: string,
  menge: number,
  ep: number | null
): Promise<ActionResult> {
  await assertAdmin()

  try {
    await productsDomain.updatePackageItem(pktNr, artNr, { menge, ep })
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Fehler beim Speichern.' }
  }

  revalidatePath(`/admin/products/packages/${pktNr}`)
  revalidatePath('/admin/products/packages')
  return { status: 'success' }
}

export async function removePackageItemAction(pktNr: string, artNr: string): Promise<ActionResult> {
  await assertAdmin()

  try {
    await productsDomain.removePackageItem(pktNr, artNr)
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Fehler beim Entfernen.' }
  }

  revalidatePath(`/admin/products/packages/${pktNr}`)
  revalidatePath('/admin/products/packages')
  return { status: 'success' }
}
