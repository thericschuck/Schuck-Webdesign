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

function revalidateArticle(artNr: string) {
  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${artNr}`)
}

// ── Preisspanne (Inline-Edit in der Tabelle) ─────────────────────────────────

export async function updateArticlePriceAction(
  artNr: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await assertAdmin()

  try {
    await productsDomain.updateArticle(artNr, {
      preisMin: num(formData, 'preis_min'),
      preisMax: num(formData, 'preis_max'),
    })
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Fehler beim Speichern.' }
  }

  revalidateArticle(artNr)
  return { status: 'success' }
}

// ── Aktiv-Toggle ──────────────────────────────────────────────────────────────

export async function toggleArticleActiveAction(artNr: string, aktiv: boolean): Promise<void> {
  await assertAdmin()
  await productsDomain.updateArticle(artNr, { aktiv })
  revalidateArticle(artNr)
}

// ── Artikel-Detail: alle Felder ───────────────────────────────────────────────

export async function updateArticleAction(
  artNr: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await assertAdmin()

  try {
    await productsDomain.updateArticle(artNr, {
      bezeichnung: str(formData, 'bezeichnung') ?? undefined,
      beschreibung: str(formData, 'beschreibung'),
      preisMin: num(formData, 'preis_min'),
      preisMax: num(formData, 'preis_max'),
      einheit: str(formData, 'einheit'),
      typ: str(formData, 'typ'),
      kategorie: str(formData, 'kategorie'),
      pflichtbetriebArtNr: str(formData, 'pflichtbetrieb_art_nr'),
      aktiv: formData.get('aktiv') === 'on',
    })
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Fehler beim Speichern.' }
  }

  revalidateArticle(artNr)
  return { status: 'success' }
}
