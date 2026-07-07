import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { CompanySettings } from '@/types/database'
import { PAGE_SIZE, MARGIN_X, fmtEuro, wrapText } from '../shared'
import { clientDisplayName, clientDisplaySubtitle } from '@/lib/client-name'

const CONTENT_WIDTH = 539 - MARGIN_X

export interface VertragPdfClient {
  full_name: string | null
  contact_name: string | null
  company_name: string | null
  client_number: string | null
  address_street: string | null
  address_zip: string | null
  address_city: string | null
  address_country: string | null
}

export interface VertragPdfOfferItem {
  bezeichnung: string
  menge: number
  ep: number
  gesamt: number
}

export interface VertragPdfInput {
  client: VertragPdfClient
  createdAt: string
  projectTitle?: string | null
  projectDescription?: string | null
  offerNumber?: string | null
  offerItems?: VertragPdfOfferItem[]
  totalNet?: number | null
  companySettings: CompanySettings
}

/**
 * Generischer Webdesign-Vertrag — Standardklauseln ohne Rechtsberatungsanspruch.
 * Layout wie lib/pdf/invoice.ts (pdf-lib, A4), mit Fließtext-Absätzen statt Tabelle.
 */
export async function generateVertragPdf(input: VertragPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const cs = input.companySettings

  let page = doc.addPage(PAGE_SIZE)
  let y = 780

  function newPage() {
    page = doc.addPage(PAGE_SIZE)
    y = 780
  }

  function ensureSpace(neededLines: number, lineHeight = 14) {
    if (y - neededLines * lineHeight < 70) newPage()
  }

  function draw(text: string, x: number, yPos: number, opts: { size?: number; useBold?: boolean; gray?: boolean } = {}) {
    page.drawText(text, {
      x,
      y: yPos,
      size: opts.size ?? 10,
      font: opts.useBold ? bold : font,
      color: opts.gray ? rgb(0.45, 0.45, 0.45) : rgb(0, 0, 0),
    })
  }

  function heading(text: string) {
    ensureSpace(3)
    y -= 8
    draw(text, MARGIN_X, y, { useBold: true, size: 12 })
    y -= 18
  }

  function paragraph(text: string, size = 10) {
    for (const line of wrapText(text, font, size, CONTENT_WIDTH)) {
      ensureSpace(1)
      draw(line, MARGIN_X, y, { size })
      y -= 14
    }
    y -= 6
  }

  function bullet(text: string, size = 10) {
    const lines = wrapText(text, font, size, CONTENT_WIDTH - 14)
    lines.forEach((line, i) => {
      ensureSpace(1)
      draw(i === 0 ? '•' : '', MARGIN_X, y, { size })
      draw(line, MARGIN_X + 14, y, { size })
      y -= 14
    })
  }

  // ── Titel ──
  draw('VERTRAG', MARGIN_X, y, { useBold: true, size: 18 })
  y -= 20
  draw('über Webdesign- und Entwicklungsleistungen', MARGIN_X, y, { size: 11, gray: true })
  y -= 30

  // ── Vertragsparteien ──
  draw('zwischen', MARGIN_X, y, { size: 9, gray: true })
  y -= 16
  draw(cs.company_name, MARGIN_X, y, { useBold: true, size: 11 })
  y -= 14
  const senderAddress = [cs.address_street, [cs.address_zip, cs.address_city].filter(Boolean).join(' ')].filter(
    (v): v is string => Boolean(v)
  )
  for (const line of senderAddress) {
    draw(line, MARGIN_X, y, { size: 10 })
    y -= 14
  }
  draw('— nachfolgend "Auftragnehmer" —', MARGIN_X, y, { size: 9, gray: true })
  y -= 24

  draw('und', MARGIN_X, y, { size: 9, gray: true })
  y -= 16
  const vertragClientName = clientDisplayName(input.client.full_name, input.client.contact_name, input.client.company_name)
  draw(vertragClientName, MARGIN_X, y, { useBold: true, size: 11 })
  y -= 14
  const vertragClientSubtitle = clientDisplaySubtitle(input.client.full_name, input.client.contact_name, input.client.company_name)
  if (vertragClientSubtitle) {
    draw(vertragClientSubtitle, MARGIN_X, y, { size: 9, gray: true })
    y -= 14
  }
  const clientAddress = [
    input.client.address_street,
    [input.client.address_zip, input.client.address_city].filter(Boolean).join(' '),
  ].filter((v): v is string => Boolean(v))
  for (const line of clientAddress) {
    draw(line, MARGIN_X, y, { size: 10 })
    y -= 14
  }
  draw('— nachfolgend "Auftraggeber" —', MARGIN_X, y, { size: 9, gray: true })
  y -= 30

  // ── §1 Vertragsgegenstand ──
  heading('§ 1 Vertragsgegenstand')
  paragraph(
    input.projectTitle
      ? `Der Auftragnehmer erbringt für den Auftraggeber im Rahmen des Projekts „${input.projectTitle}“ folgende Leistungen:`
      : 'Der Auftragnehmer erbringt für den Auftraggeber folgende Leistungen:'
  )
  if (input.projectDescription) {
    paragraph(input.projectDescription)
  }
  if (input.offerItems && input.offerItems.length > 0) {
    for (const item of input.offerItems) {
      bullet(`${item.bezeichnung} (${item.menge}× ${fmtEuro(item.ep)} = ${fmtEuro(item.gesamt)})`)
    }
    y -= 6
  }

  // ── §2 Vergütung ──
  heading('§ 2 Vergütung und Zahlungsbedingungen')
  if (input.totalNet != null) {
    paragraph(
      `Die Vergütung für die in § 1 beschriebenen Leistungen beträgt ${fmtEuro(input.totalNet)} netto` +
        (cs.ust_pflichtig ? ', zzgl. der gesetzlichen Umsatzsteuer.' : ' (§ 19 UStG, keine Umsatzsteuer ausgewiesen).') +
        (input.offerNumber ? ` Grundlage ist das Angebot ${input.offerNumber}.` : '')
    )
  }
  paragraph(
    'Sofern nicht abweichend vereinbart, wird die Vergütung wie folgt fällig: 50 % bei Auftragserteilung, ' +
      'die restlichen 50 % bei Fertigstellung bzw. Übergabe der vereinbarten Leistungen. Zahlungen sind ' +
      'innerhalb von 14 Tagen nach Rechnungsstellung ohne Abzug fällig.'
  )

  // ── §3 Laufzeit und Kündigung ──
  heading('§ 3 Laufzeit und Kündigung')
  paragraph(
    'Dieser Vertrag beginnt mit Unterzeichnung durch beide Parteien und endet mit vollständiger Erbringung der ' +
      'vereinbarten Leistungen. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.'
  )

  // ── §4 Mitwirkungspflichten ──
  heading('§ 4 Mitwirkungspflichten des Auftraggebers')
  paragraph(
    'Der Auftraggeber stellt alle für die Leistungserbringung erforderlichen Inhalte, Zugangsdaten, Texte und ' +
      'Materialien rechtzeitig und in geeigneter Form zur Verfügung. Verzögerungen, die durch verspätete ' +
      'Mitwirkung des Auftraggebers entstehen, gehen nicht zulasten des Auftragnehmers.'
  )

  // ── §5 Nutzungsrechte ──
  heading('§ 5 Nutzungsrechte')
  paragraph(
    'Mit vollständiger Bezahlung der vereinbarten Vergütung erhält der Auftraggeber das einfache, räumlich und ' +
      'zeitlich unbeschränkte Nutzungsrecht an den im Rahmen dieses Vertrags erstellten Arbeitsergebnissen für ' +
      'den vereinbarten Verwendungszweck. Bis zur vollständigen Zahlung verbleiben alle Rechte beim Auftragnehmer.'
  )

  // ── §6 Haftung ──
  heading('§ 6 Haftung')
  paragraph(
    'Der Auftragnehmer haftet nach den gesetzlichen Bestimmungen, jedoch nur für Vorsatz und grobe Fahrlässigkeit ' +
      'sowie bei der schuldhaften Verletzung wesentlicher Vertragspflichten. Die Haftung für leichte Fahrlässigkeit ' +
      'ist im Übrigen ausgeschlossen, soweit gesetzlich zulässig.'
  )

  // ── §7 Schlussbestimmungen ──
  heading('§ 7 Schlussbestimmungen')
  paragraph(
    'Änderungen und Ergänzungen dieses Vertrags bedürfen der Textform. Sollte eine Bestimmung dieses Vertrags ' +
      'unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen hiervon unberührt. Es gilt ' +
      'das Recht der Bundesrepublik Deutschland.'
  )

  // ── Unterschriften ──
  ensureSpace(6)
  y -= 20
  const sigRightX = MARGIN_X + 280

  draw('_______________________________', MARGIN_X, y, { size: 10 })
  draw('_______________________________', sigRightX, y, { size: 10 })
  y -= 14
  draw('Ort, Datum — Auftraggeber', MARGIN_X, y, { size: 8, gray: true })
  draw('Ort, Datum — Auftragnehmer', sigRightX, y, { size: 8, gray: true })
  y -= 36
  draw('_______________________________', MARGIN_X, y, { size: 10 })
  draw('_______________________________', sigRightX, y, { size: 10 })
  y -= 14
  draw(`Unterschrift ${vertragClientName}`, MARGIN_X, y, { size: 8, gray: true })
  draw(`Unterschrift ${cs.company_name}`, sigRightX, y, { size: 8, gray: true })

  return doc.save()
}
