'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/assert-admin'
import * as akquiseDomain from '@/lib/domain/akquise'
import * as documentsDomain from '@/lib/domain/documents'
import type {
  AkquiseErgebnis,
  ClientStatus,
  LeadPrioritaet,
  QualiErgebnis,
  SalesErgebnis,
} from '@/types/database'

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

// ── Lead bearbeiten ─────────────────────────────────────────────────────────

export async function updateLeadAction(
  leadId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await assertAdmin()

  try {
    await akquiseDomain.updateLead(leadId, {
      firmenname: str(formData, 'firmenname') ?? undefined,
      ansprechpartner: str(formData, 'ansprechpartner'),
      position: str(formData, 'position'),
      zielgruppe: str(formData, 'zielgruppe'),
      stadt: str(formData, 'stadt'),
      website: str(formData, 'website'),
      phone: str(formData, 'phone'),
      email: str(formData, 'email'),
      quelle: str(formData, 'quelle'),
      website_qualitaet: str(formData, 'website_qualitaet'),
      prioritaet: (str(formData, 'prioritaet') as LeadPrioritaet | null) ?? undefined,
      erstkontakt_am: str(formData, 'erstkontakt_am'),
      akquise_ergebnis: (str(formData, 'akquise_ergebnis') as AkquiseErgebnis | null) ?? undefined,
      wiedervorlage: str(formData, 'wiedervorlage'),
      notizen: str(formData, 'notizen'),
    })
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Fehler beim Speichern.' }
  }

  revalidatePath(`/admin/akquise/${leadId}`)
  revalidatePath('/admin/akquise')
  return { status: 'success' }
}

// ── Quali-Call ──────────────────────────────────────────────────────────────

export async function addQualiCallAction(
  leadId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await assertAdmin()

  try {
    await akquiseDomain.addQualiCall(leadId, {
      qualiCallAm: str(formData, 'quali_call_am'),
      qualiErgebnis: (str(formData, 'quali_ergebnis') as QualiErgebnis | null) ?? undefined,
      wiedervorlage: str(formData, 'wiedervorlage'),
      bedarfNotizen: str(formData, 'bedarf_notizen'),
    })
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Quali-Call konnte nicht gespeichert werden.' }
  }

  revalidatePath(`/admin/akquise/${leadId}`)
  revalidatePath('/admin/akquise')
  return { status: 'success' }
}

// ── Sales-Call ──────────────────────────────────────────────────────────────

export async function addSalesCallAction(
  leadId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await assertAdmin()

  try {
    await akquiseDomain.addSalesCall(leadId, {
      closingCallAm: str(formData, 'closing_call_am'),
      leistungen: str(formData, 'leistungen'),
      angebotsvolumen: num(formData, 'angebotsvolumen'),
      leistungsbeginn: str(formData, 'leistungsbeginn'),
      salesErgebnis: (str(formData, 'sales_ergebnis') as SalesErgebnis | null) ?? undefined,
      notizen: str(formData, 'notizen'),
    })
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Sales-Call konnte nicht gespeichert werden.' }
  }

  revalidatePath(`/admin/akquise/${leadId}`)
  revalidatePath('/admin/akquise')
  return { status: 'success' }
}

// ── In Kunde umwandeln ───────────────────────────────────────────────────────

type ConvertResult = { status: 'error'; message: string } | { status: 'success'; clientId: string }

export async function convertLeadToClientAction(
  leadId: string,
  _prev: ConvertResult | null,
  formData: FormData
): Promise<ConvertResult> {
  await assertAdmin()

  const email = str(formData, 'email')
  if (!email) return { status: 'error', message: 'E-Mail-Adresse ist erforderlich.' }

  try {
    const result = await akquiseDomain.convertLeadToClient(leadId, {
      email,
      status: (str(formData, 'status') as ClientStatus | null) ?? undefined,
    })
    revalidatePath(`/admin/akquise/${leadId}`)
    revalidatePath('/admin/akquise')
    revalidatePath('/admin/clients')
    return { status: 'success', clientId: result.client.id }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Umwandlung fehlgeschlagen.' }
  }
}

// ── Wiedervorlage ─────────────────────────────────────────────────────────────

export async function setWiedervorlageAction(
  leadId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await assertAdmin()

  const wiedervorlage = str(formData, 'wiedervorlage')
  if (!wiedervorlage) return { status: 'error', message: 'Datum ist erforderlich.' }

  try {
    await akquiseDomain.setWiedervorlage(leadId, wiedervorlage, str(formData, 'notiz'))
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Fehler beim Speichern.' }
  }

  revalidatePath(`/admin/akquise/${leadId}`)
  revalidatePath('/admin/akquise')
  revalidatePath('/admin/todos')
  return { status: 'success' }
}

// ── Angebot erstellen ────────────────────────────────────────────────────────

interface OfferItemFormValue {
  art_nr?: string
  bezeichnung?: string
  menge?: number
  ep: number
}

type CreateOfferResult = { status: 'error'; message: string } | { status: 'success'; offerNumber: string }

export async function createOfferAction(
  leadId: string,
  _prev: CreateOfferResult | null,
  formData: FormData
): Promise<CreateOfferResult> {
  await assertAdmin()

  const itemsRaw = str(formData, 'items_json')
  if (!itemsRaw) return { status: 'error', message: 'Mindestens eine Position ist erforderlich.' }

  let items: OfferItemFormValue[]
  try {
    items = JSON.parse(itemsRaw)
  } catch {
    return { status: 'error', message: 'Positionen konnten nicht gelesen werden.' }
  }

  try {
    const offer = await akquiseDomain.createOffer({
      leadId,
      validUntil: str(formData, 'valid_until'),
      items: items.map((item) => ({
        artNr: item.art_nr,
        bezeichnung: item.bezeichnung,
        menge: item.menge,
        ep: item.ep,
      })),
    })
    revalidatePath(`/admin/akquise/${leadId}`)
    return { status: 'success', offerNumber: offer.offer_number }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Angebot konnte nicht erstellt werden.' }
  }
}

// ── Angebots-PDF erzeugen + senden ────────────────────────────────────────

type GenerateOfferDocResult =
  | { status: 'error'; message: string }
  | { status: 'success'; documentId: string }

export async function generateOfferDocumentAction(
  leadId: string,
  clientId: string,
  offerId: string
): Promise<GenerateOfferDocResult> {
  await assertAdmin()

  try {
    const doc = await documentsDomain.generateDocument({ template: 'angebot', clientId, offerId })
    revalidatePath(`/admin/akquise/${leadId}`)
    return { status: 'success', documentId: doc.id }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Angebots-PDF konnte nicht erstellt werden.' }
  }
}

type SendOfferDocResult = { status: 'error'; message: string } | { status: 'success' }

export async function sendOfferDocumentAction(leadId: string, documentId: string, to: string): Promise<SendOfferDocResult> {
  await assertAdmin()

  try {
    await documentsDomain.sendDocument({ documentId, to })
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Angebots-PDF konnte nicht gesendet werden.' }
  }

  revalidatePath(`/admin/akquise/${leadId}`)
  return { status: 'success' }
}
