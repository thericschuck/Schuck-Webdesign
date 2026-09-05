import { createAdminClient } from '@/lib/supabase/admin'
import { DomainError } from './errors'
import {
  getCompanySettings,
  resolveDocumentItems,
  sumItems,
  type InvoiceItemInput,
  type ResolvedInvoiceItem,
} from './finance'
import { documentFromOffer, recipientFromClient } from '@/lib/documents/from-db'
import { renderDocumentToPdf } from '@/lib/documents/pdf'
import { DEFAULT_THEME } from '@/lib/documents/theme'
import { sendEmail } from '@/lib/email/send'
import { clientDisplayName } from '@/lib/client-name'
import type { Database, DocumentRecipient, Offer, OfferStatus } from '@/types/database'

type OfferUpdate = Database['public']['Tables']['offers']['Update']

export const OFFER_STATUS_VALUES: OfferStatus[] = ['entwurf', 'gesendet', 'angenommen', 'abgelehnt']

/**
 * Angebote als eigenständiger Domain-Bereich.
 *
 * Bisher lebten Angebote nur als Nebenprodukt der Akquise (lib/domain/akquise.ts
 * → createOffer an einem Lead). Damit ließ sich für einen bestehenden Kunden
 * gar kein Angebot anlegen. Dieser Bereich spiegelt bewusst die Struktur von
 * `finance.ts` (Entwurf → stellen → versenden → Status), damit Rechnung und
 * Angebot im Editor identisch bedienbar sind.
 *
 * Positionsauflösung und Summenbildung werden mit den Rechnungen geteilt
 * (`resolveDocumentItems` / `sumItems`) — inklusive der Regel, dass
 * `exclude_from_sum`-Zeilen nicht in die Summe zählen.
 */

// ── list/get ────────────────────────────────────────────────────────────────

export interface ListOffersFilter {
  status?: OfferStatus
  clientId?: string
}

export async function listOffers(filter: ListOffersFilter = {}) {
  const adminClient = createAdminClient()
  let query = adminClient
    .from('offers')
    .select(
      'id, offer_number, lead_id, client_id, status, total_net, valid_until, pdf_url, recipient, created_at, updated_at, clients(company_name, contact_name, profiles(full_name)), leads(firmenname)'
    )
    .order('created_at', { ascending: false })

  if (filter.status) query = query.eq('status', filter.status)
  if (filter.clientId) query = query.eq('client_id', filter.clientId)

  const { data, error } = await query
  if (error) throw new DomainError(error.message)

  return (data ?? []).map(({ clients, leads, ...offer }) => {
    const client = einzel(clients)
    const lead = einzel(leads)
    const profile = client ? einzel(client.profiles) : null

    // Anzeigename in derselben Reihenfolge wie der Renderer den Empfänger
    // auflöst: eingefrorener Snapshot > Kunde > Lead.
    const displayName =
      offer.recipient?.name?.trim() ||
      (client ? clientDisplayName(profile?.full_name, client.contact_name, client.company_name) : null) ||
      lead?.firmenname ||
      'Ohne Empfänger'

    return { ...offer, client_display_name: displayName }
  })
}

export type OfferRow = Awaited<ReturnType<typeof listOffers>>[number]

export async function getOffer(offerId: string) {
  const adminClient = createAdminClient()

  const [{ data: offer, error: offerError }, { data: items, error: itemsError }] = await Promise.all([
    adminClient
      .from('offers')
      .select(
        '*, clients(id, company_name, contact_name, contact_email, client_number, address_street, address_zip, address_city, address_country, profiles(email, full_name)), leads(firmenname, email)'
      )
      .eq('id', offerId)
      .single(),
    adminClient.from('offer_items').select('*').eq('offer_id', offerId).order('pos', { ascending: true }),
  ])

  if (offerError) throw new DomainError('Angebot nicht gefunden.')
  if (itemsError) throw new DomainError(itemsError.message)

  const { clients, leads, ...rest } = offer
  return {
    ...rest,
    client: einzel(clients),
    lead: einzel(leads),
    items: items ?? [],
  }
}

export type OfferDetail = Awaited<ReturnType<typeof getOffer>>

// ── Entwurf anlegen/bearbeiten ──────────────────────────────────────────────

export interface CreateOfferDraftInput {
  clientId?: string | null
  leadId?: string | null
  /** Frei eingetragener Empfänger — Pflicht, wenn weder Kunde noch Lead gesetzt ist. */
  recipient?: DocumentRecipient | null
  validUntil?: string | null
  einleitungstext?: string | null
  schlusstext?: string | null
  items: InvoiceItemInput[]
}

/** Spiegelt den DB-Check `offers_empfaenger_vorhanden` mit lesbarer Meldung. */
function assertEmpfaenger(
  clientId?: string | null,
  leadId?: string | null,
  recipient?: DocumentRecipient | null
) {
  if (!clientId && !leadId && !recipient?.name?.trim()) {
    throw new DomainError('Empfänger fehlt — entweder einen Kunden auswählen oder einen Namen eintragen.')
  }
}

export async function createOfferDraft(input: CreateOfferDraftInput): Promise<OfferDetail> {
  assertEmpfaenger(input.clientId, input.leadId, input.recipient)

  const adminClient = createAdminClient()

  if (input.clientId) {
    const { error } = await adminClient.from('clients').select('id').eq('id', input.clientId).single()
    if (error) throw new DomainError('Kunde nicht gefunden.')
  }

  const resolvedItems = await resolveDocumentItems(adminClient, input.items)

  const { data: offer, error: offerError } = await adminClient
    .from('offers')
    .insert({
      // Die AN-Nummer fällt erst beim Stellen (issueOffer) — verworfene
      // Entwürfe verbrennen so keine Nummer.
      offer_number: null,
      client_id: input.clientId ?? null,
      lead_id: input.leadId ?? null,
      recipient: input.recipient ?? null,
      status: 'entwurf',
      total_net: sumItems(resolvedItems),
      valid_until: input.validUntil ?? null,
      einleitungstext: input.einleitungstext ?? null,
      schlusstext: input.schlusstext ?? null,
    })
    .select('id')
    .single()

  if (offerError) throw new DomainError(`Angebotsentwurf konnte nicht gespeichert werden: ${offerError.message}`)

  await ersetzePositionen(offer.id, resolvedItems)
  return getOffer(offer.id)
}

export interface UpdateOfferDraftInput {
  clientId?: string | null
  recipient?: DocumentRecipient | null
  validUntil?: string | null
  einleitungstext?: string | null
  schlusstext?: string | null
  items?: InvoiceItemInput[]
}

export async function updateOfferDraft(offerId: string, patch: UpdateOfferDraftInput): Promise<OfferDetail> {
  const adminClient = createAdminClient()

  const { data: existing, error: existingError } = await adminClient
    .from('offers')
    .select('status, client_id, lead_id, recipient')
    .eq('id', offerId)
    .single()
  if (existingError) throw new DomainError('Angebot nicht gefunden.')
  if (existing.status !== 'entwurf') {
    throw new DomainError('Nur Entwürfe können bearbeitet werden — gestellte Angebote sind festgeschrieben.')
  }

  // Gegen den Stand NACH dem Patch prüfen, nicht gegen den Patch allein.
  assertEmpfaenger(
    patch.clientId !== undefined ? patch.clientId : existing.client_id,
    existing.lead_id,
    patch.recipient !== undefined ? patch.recipient : existing.recipient
  )

  const updates: Record<string, unknown> = {}
  if (patch.clientId !== undefined) updates.client_id = patch.clientId
  if (patch.recipient !== undefined) updates.recipient = patch.recipient
  if (patch.validUntil !== undefined) updates.valid_until = patch.validUntil
  if (patch.einleitungstext !== undefined) updates.einleitungstext = patch.einleitungstext
  if (patch.schlusstext !== undefined) updates.schlusstext = patch.schlusstext

  let resolvedItems: ResolvedInvoiceItem[] | null = null
  if (patch.items) {
    resolvedItems = await resolveDocumentItems(adminClient, patch.items)
    updates.total_net = sumItems(resolvedItems)
  }

  if (Object.keys(updates).length === 0) throw new DomainError('Keine Änderungen übergeben.')
  updates.updated_at = new Date().toISOString()

  const { error: updateError } = await adminClient.from('offers').update(updates as OfferUpdate).eq('id', offerId)
  if (updateError) throw new DomainError(updateError.message)

  if (resolvedItems) await ersetzePositionen(offerId, resolvedItems)

  return getOffer(offerId)
}

/** Positionen sind kein Verlauf, sondern der aktuelle Stand — daher ersetzen statt patchen. */
async function ersetzePositionen(offerId: string, items: ResolvedInvoiceItem[]) {
  const adminClient = createAdminClient()

  const { error: deleteError } = await adminClient.from('offer_items').delete().eq('offer_id', offerId)
  if (deleteError) throw new DomainError(`Positionen konnten nicht aktualisiert werden: ${deleteError.message}`)

  const { error: insertError } = await adminClient
    .from('offer_items')
    .insert(items.map((i) => ({ ...i, offer_id: offerId })))
  if (insertError) throw new DomainError(`Positionen konnten nicht gespeichert werden: ${insertError.message}`)
}

export async function deleteOfferDraft(offerId: string): Promise<void> {
  const adminClient = createAdminClient()

  const { data: offer, error } = await adminClient.from('offers').select('status, offer_number').eq('id', offerId).single()
  if (error) throw new DomainError('Angebot nicht gefunden.')
  if (offer.status !== 'entwurf' || offer.offer_number) {
    throw new DomainError('Nur Entwürfe ohne vergebene Nummer können gelöscht werden.')
  }

  const { error: deleteError } = await adminClient.from('offers').delete().eq('id', offerId)
  if (deleteError) throw new DomainError(deleteError.message)
}

// ── stellen ─────────────────────────────────────────────────────────────────

/**
 * Schreibt das Angebot fest: zieht die AN-Nummer über die atomare
 * Postgres-Funktion `issue_offer` (Nummer + Statuswechsel in einer Transaktion)
 * und erzeugt danach das PDF.
 *
 * Wie bei `issueInvoice` wird die Empfängeranschrift vorher eingefroren, damit
 * ein späterer Umzug des Kunden das bereits herausgegebene Angebot nicht
 * rückwirkend verändert.
 */
export async function issueOffer(offerId: string): Promise<OfferDetail> {
  const adminClient = createAdminClient()
  let offer = await getOffer(offerId)

  if (!offer.offer_number) {
    if (!offer.recipient && offer.client) {
      const profile = einzel(offer.client.profiles)
      const snapshot = recipientFromClient({ ...offer.client, full_name: profile?.full_name ?? null })
      const { error } = await adminClient.from('offers').update({ recipient: snapshot }).eq('id', offerId)
      if (error) throw new DomainError(`Empfängerdaten konnten nicht eingefroren werden: ${error.message}`)
      offer = { ...offer, recipient: snapshot }
    }

    const { data: issued, error } = await adminClient.rpc('issue_offer', { p_id: offerId })
    if (error) throw new DomainError(error.message)
    offer = { ...offer, ...(issued as Offer) }
  }

  await generateAndStoreOfferPdf(offer)
  return getOffer(offerId)
}

async function buildOfferPdf(offer: OfferDetail): Promise<Uint8Array> {
  const companySettings = await getCompanySettings()
  const profile = offer.client ? einzel(offer.client.profiles) : null

  const data = documentFromOffer({
    offer,
    client: offer.client ? { ...offer.client, full_name: profile?.full_name ?? null } : null,
    items: offer.items,
    companySettings,
  })

  return renderDocumentToPdf(data, DEFAULT_THEME)
}

/** Angebots-PDFs liegen im selben privaten Bucket wie Rechnungen, in einem
 * eigenen Präfix — ein zweiter Bucket bräuchte eigene Policies ohne Mehrwert. */
async function generateAndStoreOfferPdf(offer: OfferDetail): Promise<string> {
  const adminClient = createAdminClient()
  const pdfBytes = await buildOfferPdf(offer)

  const path = `angebote/${offer.client_id ?? 'ohne-kunde'}/${offer.offer_number ?? offer.id}.pdf`
  const { error: uploadError } = await adminClient.storage
    .from('invoices')
    .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true })
  if (uploadError) throw new DomainError(`PDF konnte nicht gespeichert werden: ${uploadError.message}`)

  const { error: updateError } = await adminClient.from('offers').update({ pdf_url: path }).eq('id', offer.id)
  if (updateError) throw new DomainError(`PDF gespeichert, aber pdf_url konnte nicht gesetzt werden: ${updateError.message}`)

  return path
}

export async function getOfferPdfUrl(pdfPath: string): Promise<string | null> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.storage.from('invoices').createSignedUrl(pdfPath, 60 * 60)
  if (error) return null
  return data.signedUrl
}

// ── Status / Versand ────────────────────────────────────────────────────────

export async function updateOfferStatus(offerId: string, status: OfferStatus): Promise<Offer> {
  if (!OFFER_STATUS_VALUES.includes(status)) throw new DomainError(`Unbekannter Status "${status}".`)

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('offers')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', offerId)
    .select('*')
    .single()
  if (error) throw new DomainError(error.message)
  return data
}

export async function sendOffer(offerId: string, to?: string): Promise<{ sent: true; to: string }> {
  const offer = await getOffer(offerId)
  if (!offer.offer_number) throw new DomainError('Angebot ist noch ein Entwurf — erst stellen.')

  const profile = offer.client ? einzel(offer.client.profiles) : null
  const empfaenger =
    to ??
    profile?.email ??
    offer.client?.contact_email ??
    offer.recipient?.email ??
    offer.lead?.email ??
    null
  if (!empfaenger) throw new DomainError('Keine Empfänger-E-Mail-Adresse angegeben oder hinterlegt.')

  const pdfBytes = await buildOfferPdf(offer)

  const result = await sendEmail({
    to: empfaenger,
    subject: `Angebot ${offer.offer_number}`,
    html: `Sehr geehrte Damen und Herren,<br><br>anbei erhalten Sie unser Angebot ${offer.offer_number}.<br><br>Beste Grüße<br>Schuck Webdesign`,
    attachment: { filename: `Angebot-${offer.offer_number}.pdf`, content: pdfBytes },
  })
  if (!result.sent) throw new DomainError(`Angebot konnte nicht gesendet werden: ${result.error}`)

  return { sent: true, to: empfaenger }
}

/** Supabase liefert eingebettete 1:1-Relationen mal als Objekt, mal als Array. */
function einzel<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}
