/**
 * End-to-End-Prüfung des Dokument-Editors gegen die echte Datenbank.
 *
 * Deckt genau die Wege ab, die mit Migration 0036 neu sind:
 *   * Rechnung/Angebot OHNE Kundendatensatz (freier Empfänger)
 *   * Positionsfelder beschreibung / ep_label / betrag_label / exclude_from_sum
 *   * Summenbildung, die `exclude_from_sum`-Zeilen auslässt
 *   * PDF-Erzeugung über den gemeinsamen Renderer
 *
 * Legt nur Entwürfe an und löscht sie wieder — es wird bewusst KEINE Nummer
 * gezogen und nichts in den Storage geladen, damit der Test keine Lücke im
 * RE-/AN-Nummernkreis hinterlässt.
 *
 * Aufruf: npm run doc:verify-editor
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createAdminClient } from '../lib/supabase/admin'
import * as financeDomain from '../lib/domain/finance'
import * as offersDomain from '../lib/domain/offers'
import { documentFromInvoice, documentFromOffer } from '../lib/documents/from-db'
import { renderDocumentToPdf } from '../lib/documents/pdf'
import { DEFAULT_THEME } from '../lib/documents/theme'
import type { DocumentRecipient } from '../types/database'

const EMPFAENGER: DocumentRecipient = {
  name: 'Testempfänger ohne Kundendatensatz',
  zusatz: 'Musterbetrieb e. K.',
  strasse: 'Teststraße 1',
  plz: '63911',
  ort: 'Klingenberg',
  land: 'Deutschland',
  kundennummer: null,
  email: null,
}

/** Zwei zahlende Positionen (3400 + 780) plus eine Abo-Zeile, die NICHT zählt. */
const POSITIONEN = [
  {
    bezeichnung: 'Website-Paket',
    beschreibung: 'Erste Zeile.\nZweite Zeile.',
    menge: 1,
    ep: 3400,
  },
  { bezeichnung: 'Mehrsprachigkeit', menge: 1, ep: 780 },
  {
    bezeichnung: 'Care-Paket',
    menge: 1,
    ep: 25,
    epLabel: '25,00 € p.M.',
    betragLabel: '–',
    excludeFromSum: true,
  },
]

const ERWARTETE_SUMME = 4180

let fehler = 0

function pruefe(bedingung: boolean, beschreibung: string, detail?: string) {
  if (bedingung) {
    console.log(`  OK    ${beschreibung}`)
  } else {
    fehler++
    console.log(`  FEHLT ${beschreibung}${detail ? ` — ${detail}` : ''}`)
  }
}

async function main() {
  const adminClient = createAdminClient()
  const companySettings = await financeDomain.getCompanySettings()

  // ── Rechnung ──────────────────────────────────────────────────────────────
  console.log('\nRechnungsentwurf ohne Kunde:')
  const invoice = await financeDomain.createInvoiceDraft({
    recipient: EMPFAENGER,
    serviceDate: '2026-08-15',
    schlusstext: 'Testlauf — wird gleich wieder gelöscht.',
    items: POSITIONEN,
  })

  try {
    pruefe(invoice.client_id === null, 'client_id ist null')
    pruefe(invoice.total_net === ERWARTETE_SUMME, 'exclude_from_sum bleibt aus der Summe', `total_net=${invoice.total_net}, erwartet ${ERWARTETE_SUMME}`)

    const geladen = await financeDomain.getInvoice(invoice.id)
    const abo = geladen.items.find((i) => i.bezeichnung === 'Care-Paket')
    pruefe(abo?.ep_label === '25,00 € p.M.', 'ep_label gespeichert')
    pruefe(abo?.betrag_label === '–', 'betrag_label gespeichert')
    pruefe(abo?.exclude_from_sum === true, 'exclude_from_sum gespeichert')
    pruefe(
      geladen.items.find((i) => i.bezeichnung === 'Website-Paket')?.beschreibung?.includes('\n') === true,
      'mehrzeilige Beschreibung gespeichert'
    )
    pruefe(geladen.recipient?.name === EMPFAENGER.name, 'recipient-Snapshot gespeichert')

    const rechnungPdf = await renderDocumentToPdf(
      documentFromInvoice({
        invoice: { ...geladen, invoice_number: 'VORSCHAU' },
        client: null,
        items: geladen.items,
        companySettings,
      }),
      DEFAULT_THEME
    )
    pruefe(rechnungPdf.byteLength > 20_000, 'PDF ohne Kundendatensatz erzeugt', `${rechnungPdf.byteLength} Bytes`)
  } finally {
    // Entwürfe dürfen gelöscht werden (GoBD-Trigger erlaubt DELETE nur hier).
    await adminClient.from('invoices').delete().eq('id', invoice.id)
  }

  // ── Angebot ───────────────────────────────────────────────────────────────
  console.log('\nAngebotsentwurf ohne Kunde:')
  const offer = await offersDomain.createOfferDraft({
    recipient: EMPFAENGER,
    validUntil: '2026-09-30',
    items: POSITIONEN,
  })

  try {
    pruefe(offer.offer_number === null, 'noch keine AN-Nummer (fällt erst beim Stellen)')
    pruefe(offer.status === 'entwurf', 'Status ist Entwurf')
    pruefe(offer.total_net === ERWARTETE_SUMME, 'Summe stimmt', `total_net=${offer.total_net}`)
    pruefe(offer.items.length === 3, 'alle drei Positionen gespeichert')

    const angebotPdf = await renderDocumentToPdf(
      documentFromOffer({ offer, client: null, items: offer.items, companySettings }),
      DEFAULT_THEME
    )
    pruefe(angebotPdf.byteLength > 20_000, 'Angebots-PDF erzeugt', `${angebotPdf.byteLength} Bytes`)

    const nachUpdate = await offersDomain.updateOfferDraft(offer.id, {
      schlusstext: 'Geänderter Schlusstext.',
      items: POSITIONEN.slice(0, 1),
    })
    pruefe(nachUpdate.items.length === 1, 'Positionen ersetzt statt ergänzt')
    pruefe(nachUpdate.total_net === 3400, 'Summe nach Update neu berechnet', `total_net=${nachUpdate.total_net}`)
    pruefe(nachUpdate.schlusstext === 'Geänderter Schlusstext.', 'Schlusstext gespeichert')
  } finally {
    await offersDomain.deleteOfferDraft(offer.id)
  }

  // ── Aufräumen bestätigen ──────────────────────────────────────────────────
  console.log('\nAufräumen:')
  const [{ data: restInvoice }, { data: restOffer }] = await Promise.all([
    adminClient.from('invoices').select('id').eq('id', invoice.id).maybeSingle(),
    adminClient.from('offers').select('id').eq('id', offer.id).maybeSingle(),
  ])
  pruefe(restInvoice === null, 'Testrechnung gelöscht')
  pruefe(restOffer === null, 'Testangebot gelöscht')

  console.log(fehler === 0 ? '\nAlles bestanden.' : `\n${fehler} Prüfung(en) fehlgeschlagen.`)
  process.exit(fehler === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
