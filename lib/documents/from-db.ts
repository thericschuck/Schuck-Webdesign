import type { CompanySettings, DocumentRecipient } from '@/types/database'
import { clientDisplayName, clientDisplaySubtitle } from '@/lib/client-name'
import type { DocumentData, DocumentParty, DocumentPosition, DocumentSender, DocumentSumme } from './types'
import { addDays, fmtDate } from './format'

/**
 * Übersetzt DB-Zeilen in `DocumentData`.
 *
 * Bewusst über strukturelle Typen statt über `InvoiceDetail`/`Offer` direkt:
 * dieselben Funktionen sollen auch den noch nicht gespeicherten Formularzustand
 * im Editor rendern können (Live-Vorschau beim Tippen). Deshalb enthält dieses
 * Modul auch keine Supabase-Aufrufe — es rechnet nur um und läuft im Browser.
 */

/** Zahlungsziel in Tagen. Gespiegelt aus lib/pdf/shared.ts, wo derselbe Wert
 * die "überfällig"-Kachel im Dashboard speist — beide müssen gleich bleiben. */
export const ZAHLUNGSZIEL_TAGE = 14

export const UST_SATZ = 19

// ── gemeinsame Bausteine ────────────────────────────────────────────────────

export function senderFromCompanySettings(cs: CompanySettings): DocumentSender {
  return {
    firma: cs.company_name,
    inhaber: cs.inhaber,
    strasse: cs.address_street,
    plz: cs.address_zip,
    ort: cs.address_city,
    land: cs.address_country,
    email: cs.email,
    telefon: cs.phone,
    website: cs.website,
    iban: cs.iban,
    bic: cs.bic,
    bankName: cs.bank_name,
    steuernummer: cs.steuernummer,
    ustId: cs.ust_id,
  }
}

/** Minimale Kundenform, wie sie sowohl aus `getInvoice()` als auch aus dem
 * Editor-State kommt. */
export interface ClientLike {
  full_name?: string | null
  contact_name?: string | null
  company_name?: string | null
  client_number?: string | null
  address_street?: string | null
  address_zip?: string | null
  address_city?: string | null
  address_country?: string | null
}

/**
 * Ermittelt den Empfängerblock.
 *
 * Vorrang hat der gespeicherte `recipient`-Snapshot (Migration 0036): er ist
 * entweder der frei eingetragene Empfänger ohne Kundendatensatz — oder die beim
 * Stellen eingefrorene Anschrift eines Kunden. Nur wenn er fehlt (Altbestand,
 * frischer Entwurf mit ausgewähltem Kunden), wird aus dem Kunden abgeleitet.
 */
function empfaengerFrom(recipient?: DocumentRecipient | null, client?: ClientLike | null): DocumentParty {
  if (recipient?.name?.trim()) {
    return {
      name: recipient.name,
      zusatz: recipient.zusatz ?? null,
      strasse: recipient.strasse ?? null,
      plz: recipient.plz ?? null,
      ort: recipient.ort ?? null,
      land: recipient.land ?? null,
    }
  }

  if (client) {
    return {
      name: clientDisplayName(client.full_name, client.contact_name, client.company_name),
      zusatz: clientDisplaySubtitle(client.full_name, client.contact_name, client.company_name),
      strasse: client.address_street,
      plz: client.address_zip,
      ort: client.address_city,
      land: client.address_country,
    }
  }

  // Kann nur im noch unvollständigen Editor-Entwurf auftreten — das Dokument
  // soll trotzdem rendern, statt die Vorschau abstürzen zu lassen.
  return { name: 'Empfänger fehlt' }
}

/** Kundennummer aus Snapshot oder Kundendatensatz. */
function kundennummerFrom(recipient?: DocumentRecipient | null, client?: ClientLike | null): string | null {
  return recipient?.kundennummer?.trim() || client?.client_number || null
}

/**
 * Baut den Snapshot, der beim Stellen auf dem Dokument eingefroren wird.
 * Aufrufer ist der Domain-Layer, nicht der Renderer.
 */
export function recipientFromClient(client: ClientLike): DocumentRecipient {
  return {
    name: clientDisplayName(client.full_name, client.contact_name, client.company_name),
    zusatz: clientDisplaySubtitle(client.full_name, client.contact_name, client.company_name),
    strasse: client.address_street ?? null,
    plz: client.address_zip ?? null,
    ort: client.address_city ?? null,
    land: client.address_country ?? null,
    kundennummer: client.client_number ?? null,
  }
}

/** Positionsform aus `invoice_items` / `offer_items`. Die Zusatzfelder existieren
 * erst ab Migration 0036 — bis dahin sind sie schlicht `undefined`. */
export interface ItemLike {
  pos: number
  art_nr?: string | null
  bezeichnung: string
  beschreibung?: string | null
  menge: number
  ep: number
  gesamt: number
  ep_label?: string | null
  betrag_label?: string | null
  exclude_from_sum?: boolean | null
}

function positionenFromItems(items: ItemLike[]): DocumentPosition[] {
  return items.map((item) => ({
    pos: item.pos,
    artNr: item.art_nr ?? null,
    titel: item.bezeichnung,
    beschreibung: item.beschreibung ?? null,
    menge: Number(item.menge),
    einzelpreis: Number(item.ep),
    gesamt: Number(item.gesamt),
    einzelpreisLabel: item.ep_label ?? null,
    betragLabel: item.betrag_label ?? null,
    excludeFromSum: item.exclude_from_sum ?? false,
  }))
}

/**
 * Summe aus dem Nettobetrag. `exclude_from_sum`-Positionen sind hier bereits
 * heraus — die Domain rechnet `total_net` so aus. Bei §19-Kleinunternehmer
 * bleibt der USt-Teil leer.
 */
function summeFrom(totalNet: number, ustPflichtig: boolean): DocumentSumme {
  if (!ustPflichtig) {
    return { netto: totalNet, ustPflichtig: false, ustSatz: null, ustBetrag: null, brutto: null }
  }
  const ustBetrag = Math.round(totalNet * (UST_SATZ / 100) * 100) / 100
  return {
    netto: totalNet,
    ustPflichtig: true,
    ustSatz: UST_SATZ,
    ustBetrag,
    brutto: Math.round((totalNet + ustBetrag) * 100) / 100,
  }
}

// ── Rechnung ────────────────────────────────────────────────────────────────

export interface InvoiceDocumentInput {
  invoice: {
    invoice_number?: string | null
    invoice_date?: string | null
    service_date?: string | null
    ust_pflichtig: boolean
    total_net: number
    status?: string | null
    recipient?: DocumentRecipient | null
    einleitungstext?: string | null
    schlusstext?: string | null
  }
  client?: ClientLike | null
  items: ItemLike[]
  companySettings: CompanySettings
}

export function documentFromInvoice(input: InvoiceDocumentInput): DocumentData {
  const { invoice, client, items, companySettings } = input
  const entwurf = !invoice.invoice_number
  // Für den Entwurf gibt es noch kein Rechnungsdatum — fürs Layout wird das
  // heutige Datum eingesetzt, damit die Vorschau nicht mit Lücken rechnet.
  const datum = invoice.invoice_date ?? new Date().toISOString().slice(0, 10)
  const kundennummer = kundennummerFrom(invoice.recipient, client)

  const meta = [
    { label: 'Rechnungsdatum', value: fmtDate(datum) },
    ...(invoice.service_date ? [{ label: 'Leistungsdatum', value: fmtDate(invoice.service_date) }] : []),
    { label: 'Fälligkeitsdatum', value: fmtDate(addDays(datum, ZAHLUNGSZIEL_TAGE)) },
    ...(kundennummer ? [{ label: 'Kundennummer', value: kundennummer }] : []),
  ]

  const hinweise = [
    // §19-Hinweis ist eine Pflichtangabe, sobald keine USt ausgewiesen wird.
    ...(invoice.ust_pflichtig ? [] : ['Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.']),
    'Bitte zahlen Sie die Rechnung bis zum oben angegebenen Fälligkeitsdatum.',
  ]

  return {
    kind: 'rechnung',
    titel: 'Rechnung',
    nummer: invoice.invoice_number ?? null,
    entwurf,
    empfaenger: empfaengerFrom(invoice.recipient, client),
    absender: senderFromCompanySettings(companySettings),
    meta,
    anrede: 'Sehr geehrte Damen und Herren,',
    einleitungstext: invoice.einleitungstext ?? 'vielen Dank für Ihren Auftrag bei Schuck Webdesign.',
    positionen: positionenFromItems(items),
    summe: summeFrom(Number(invoice.total_net), invoice.ust_pflichtig),
    hinweise,
    schlusstext: invoice.schlusstext ?? null,
    grussformel: 'Freundliche Grüße',
    unterschrift: companySettings.inhaber ?? companySettings.company_name,
  }
}

// ── Angebot ─────────────────────────────────────────────────────────────────

export interface OfferDocumentInput {
  offer: {
    offer_number?: string | null
    created_at?: string | null
    valid_until?: string | null
    total_net?: number | null
    recipient?: DocumentRecipient | null
    einleitungstext?: string | null
    schlusstext?: string | null
  }
  client?: ClientLike | null
  items: ItemLike[]
  companySettings: CompanySettings
}

export function documentFromOffer(input: OfferDocumentInput): DocumentData {
  const { offer, client, items, companySettings } = input
  const datum = offer.created_at ?? new Date().toISOString()
  const kundennummer = kundennummerFrom(offer.recipient, client)

  const meta = [
    { label: 'Angebotsdatum', value: fmtDate(datum) },
    ...(offer.valid_until ? [{ label: 'Gültig bis', value: fmtDate(offer.valid_until) }] : []),
    ...(kundennummer ? [{ label: 'Kundennummer', value: kundennummer }] : []),
  ]

  const hinweise = [
    companySettings.ust_pflichtig
      ? 'Alle Preise verstehen sich netto, zzgl. der gesetzlichen Umsatzsteuer.'
      : 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.',
    ...(offer.valid_until ? [`Dieses Angebot ist gültig bis zum ${fmtDate(offer.valid_until)}.`] : []),
  ]

  return {
    kind: 'angebot',
    titel: 'Angebot',
    nummer: offer.offer_number ?? null,
    entwurf: !offer.offer_number,
    empfaenger: empfaengerFrom(offer.recipient, client),
    absender: senderFromCompanySettings(companySettings),
    meta,
    anrede: 'Sehr geehrte Damen und Herren,',
    einleitungstext:
      offer.einleitungstext ?? 'vielen Dank für Ihr Interesse. Gerne unterbreite ich Ihnen folgendes Angebot.',
    positionen: positionenFromItems(items),
    // Ein Angebot weist nie USt aus — der Hinweistext oben regelt das.
    summe: summeFrom(Number(offer.total_net ?? 0), false),
    hinweise,
    schlusstext: offer.schlusstext ?? null,
    grussformel: 'Freundliche Grüße',
    unterschrift: companySettings.inhaber ?? companySettings.company_name,
  }
}
