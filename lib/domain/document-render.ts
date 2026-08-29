import { createAdminClient } from '@/lib/supabase/admin'
import { DomainError } from './errors'
import { getCompanySettings } from './finance'
import { documentFromInvoice, documentFromOffer, type ItemLike } from '@/lib/documents/from-db'
import { DEFAULT_THEME } from '@/lib/documents/theme'
import type { DocumentData, DocumentTheme } from '@/lib/documents/types'

/**
 * Lädt die Daten für ein Dokument aus der DB und übersetzt sie in `DocumentData`.
 *
 * Getrennt von `lib/domain/documents.ts` (das die *gespeicherten* Dokumente im
 * Storage verwaltet): hier geht es nur darum, aus Rechnung/Angebot das
 * druckbare Modell zu bauen. Der eigentliche Renderer bleibt dumm und kennt
 * weder Supabase noch DomainError.
 */

export type RenderbarerTyp = 'rechnung' | 'angebot'

export interface DokumentQuelle {
  data: DocumentData
  theme: DocumentTheme
  /** Dateiname für den Download, ohne Endung. */
  dateiname: string
}

/**
 * Das aktive Theme. Ab Phase 7 kommt es aus `document_themes` bzw. – bei
 * gestellten Rechnungen – aus dem eingefrorenen `theme_snapshot`. Bis dahin
 * immer der Default, damit sich am Layout nichts unbemerkt ändert.
 */
function aktivesTheme(): DocumentTheme {
  return DEFAULT_THEME
}

export async function ladeDokument(typ: RenderbarerTyp, id: string): Promise<DokumentQuelle> {
  return typ === 'rechnung' ? ladeRechnung(id) : ladeAngebot(id)
}

async function ladeRechnung(invoiceId: string): Promise<DokumentQuelle> {
  const adminClient = createAdminClient()

  const [{ data: invoice, error: invoiceError }, { data: items, error: itemsError }] = await Promise.all([
    adminClient
      .from('invoices')
      .select(
        '*, clients(company_name, contact_name, client_number, address_street, address_zip, address_city, address_country, profiles(full_name))'
      )
      .eq('id', invoiceId)
      .single(),
    adminClient.from('invoice_items').select('*').eq('invoice_id', invoiceId).order('pos', { ascending: true }),
  ])

  if (invoiceError) throw new DomainError('Rechnung nicht gefunden.')
  if (itemsError) throw new DomainError(itemsError.message)

  const client = einzel(invoice.clients)
  if (!client) throw new DomainError('Kunde der Rechnung konnte nicht geladen werden.')
  const profile = einzel(client.profiles)

  const companySettings = await getCompanySettings()

  const data = documentFromInvoice({
    invoice,
    client: { ...client, full_name: profile?.full_name ?? null },
    items: (items ?? []) as ItemLike[],
    companySettings,
  })

  return {
    data,
    theme: aktivesTheme(),
    dateiname: `Rechnung-${invoice.invoice_number ?? 'Entwurf'}`,
  }
}

async function ladeAngebot(offerId: string): Promise<DokumentQuelle> {
  const adminClient = createAdminClient()

  const [{ data: offer, error: offerError }, { data: items, error: itemsError }] = await Promise.all([
    adminClient
      .from('offers')
      .select(
        '*, clients(company_name, contact_name, client_number, address_street, address_zip, address_city, address_country, profiles(full_name))'
      )
      .eq('id', offerId)
      .single(),
    adminClient.from('offer_items').select('*').eq('offer_id', offerId).order('pos', { ascending: true }),
  ])

  if (offerError) throw new DomainError('Angebot nicht gefunden.')
  if (itemsError) throw new DomainError(itemsError.message)

  const client = einzel(offer.clients)
  if (!client) {
    // Angebote können (noch) an einem Lead statt an einem Kunden hängen —
    // siehe offers.lead_id. Ohne Kundendatensatz fehlt die Anschrift.
    throw new DomainError('Dieses Angebot ist keinem Kunden zugeordnet — Anschrift fehlt.')
  }
  const profile = einzel(client.profiles)

  const companySettings = await getCompanySettings()

  const data = documentFromOffer({
    offer,
    client: { ...client, full_name: profile?.full_name ?? null },
    items: (items ?? []) as ItemLike[],
    companySettings,
  })

  return {
    data,
    theme: aktivesTheme(),
    dateiname: `Angebot-${offer.offer_number ?? 'Entwurf'}`,
  }
}

/** Supabase liefert eingebettete 1:1-Relationen je nach Query mal als Objekt,
 * mal als Array — hier auf die Einzelform normalisiert. */
function einzel<T>(value: T | T[] | null): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}
