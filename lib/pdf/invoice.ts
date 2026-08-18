import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { CompanySettings } from '@/types/database'
import { clientDisplayName, clientDisplaySubtitle } from '@/lib/client-name'
import { PAGE_SIZE, MARGIN_X, fmtEuro, fmtDate, OVERDUE_DAYS, addDays } from './shared'

const CONTENT_RIGHT = PAGE_SIZE[0] - MARGIN_X // 539.28
const LOGO_PATH = path.join(process.cwd(), 'public', 'Logo_Lang.png')
const LOGO_WIDTH = 100
const LOGO_HEIGHT = LOGO_WIDTH / 2.2 // Seitenverhältnis von Logo_Lang.png (220x100)

export interface InvoicePdfItem {
  pos: number
  bezeichnung: string
  menge: number
  ep: number
  gesamt: number
}

export interface InvoicePdfClient {
  full_name: string | null
  contact_name: string | null
  company_name: string | null
  client_number: string | null
  address_street: string | null
  address_zip: string | null
  address_city: string | null
  address_country: string | null
}

export interface InvoicePdfInput {
  invoiceNumber: string
  invoiceDate: string
  serviceDate: string | null
  ustPflichtig: boolean
  totalNet: number
  items: InvoicePdfItem[]
  client: InvoicePdfClient
  companySettings: CompanySettings
  projectTitle?: string | null
}

/**
 * Erzeugt Rechnungs-PDFs rein serverseitig mit pdf-lib (kein Headless-Browser,
 * keine nativen Abhängigkeiten) — läuft unverändert in Vercel Serverless
 * Functions. Layout folgt Erics eigener Vorlage (docs/vorlagen/Rechnung_Vorlage.pdf).
 * Enthält die GoBD-Pflichtangaben nach § 14 UStG sowie den §19-UStG-Hinweis,
 * wenn ustPflichtig=false (Kleinunternehmerregelung).
 */
export async function generateInvoicePdf(input: InvoicePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const logoBytes = await readFile(LOGO_PATH)
  const logo = await doc.embedPng(logoBytes)

  let page = doc.addPage(PAGE_SIZE)
  const cs = input.companySettings

  const draw = (text: string, x: number, y: number, opts: { size?: number; useBold?: boolean; gray?: boolean } = {}) => {
    page.drawText(text, {
      x,
      y,
      size: opts.size ?? 10,
      font: opts.useBold ? bold : font,
      color: opts.gray ? rgb(0.45, 0.45, 0.45) : rgb(0.07, 0.07, 0.07),
    })
  }

  page.drawImage(logo, {
    x: CONTENT_RIGHT - LOGO_WIDTH,
    y: 841.89 - 40 - LOGO_HEIGHT,
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  })

  const senderLine = [cs.company_name, cs.address_street, [cs.address_zip, cs.address_city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' · ')

  // ── Titel + Absenderzeile (oben links) ──
  let y = 780
  draw('Rechnung', MARGIN_X, y, { useBold: true, size: 26 })
  y -= 30
  draw(senderLine, MARGIN_X, y, { size: 8, gray: true })
  y -= 44

  const blockStartY = y

  // ── Empfänger (links) ──
  draw(clientDisplayName(input.client.full_name, input.client.contact_name, input.client.company_name), MARGIN_X, y, { useBold: true, size: 11 })
  y -= 14
  const invoiceClientSubtitle = clientDisplaySubtitle(input.client.full_name, input.client.contact_name, input.client.company_name)
  if (invoiceClientSubtitle) {
    draw(invoiceClientSubtitle, MARGIN_X, y, { size: 9, gray: true })
    y -= 14
  }
  if (input.client.address_street) {
    draw(input.client.address_street, MARGIN_X, y)
    y -= 14
  }
  if (input.client.address_zip || input.client.address_city) {
    draw([input.client.address_zip, input.client.address_city].filter(Boolean).join(' '), MARGIN_X, y)
    y -= 14
  }
  if (input.client.address_country && input.client.address_country !== 'Deutschland') {
    draw(input.client.address_country, MARGIN_X, y)
    y -= 14
  }

  // ── Termine (rechts, auf gleicher Höhe wie der Empfänger-Block) ──
  const rightX = 330
  let yMeta = blockStartY
  const dueDate = addDays(input.invoiceDate, OVERDUE_DAYS)

  const metaLine = (label: string, value: string) => {
    draw(label, rightX, yMeta, { size: 9, gray: true })
    draw(value, rightX + 110, yMeta, { size: 9 })
    yMeta -= 14
  }

  metaLine('Rechnungsdatum:', fmtDate(input.invoiceDate))
  if (input.serviceDate) metaLine('Leistungsdatum:', fmtDate(input.serviceDate))
  metaLine('Fälligkeitsdatum:', fmtDate(dueDate))

  y = Math.min(y, yMeta) - 22

  // ── Rechnungsnummer (volle Breite, fett) ──
  draw(`Rechnung Nr. ${input.invoiceNumber}`, MARGIN_X, y, { useBold: true, size: 12 })
  y -= 34

  // ── Anschreiben ──
  draw('Sehr geehrte Damen und Herren,', MARGIN_X, y, { size: 10 })
  y -= 20
  draw('vielen Dank für Ihren Auftrag bei Schuck-Webdesign.', MARGIN_X, y, { size: 10 })
  y -= 34

  // ── Positionstabelle ──
  const colPos = MARGIN_X
  const colBezeichnung = MARGIN_X + 34
  const colMenge = 350
  const colEpRight = 462 // rechte Kante der Einzelpreis-Spalte
  const colGesamtRight = CONTENT_RIGHT // rechte Kante der Gesamtpreis-Spalte

  const drawRight = (text: string, rightEdge: number, y: number, f: PDFFont, size: number, gray = false) => {
    page.drawText(text, { x: rightEdge - f.widthOfTextAtSize(text, size), y, size, font: f, color: gray ? rgb(0.45, 0.45, 0.45) : rgb(0.07, 0.07, 0.07) })
  }

  const drawTableHeader = () => {
    page.drawRectangle({
      x: MARGIN_X - 4,
      y: y - 4,
      width: CONTENT_RIGHT - MARGIN_X + 8,
      height: 18,
      color: rgb(0.95, 0.95, 0.95),
    })
    draw('POS', colPos, y, { useBold: true, size: 9 })
    draw('BESCHREIBUNG', colBezeichnung, y, { useBold: true, size: 9 })
    draw('MENGE', colMenge, y, { useBold: true, size: 9 })
    drawRight('EINZELPREIS', colEpRight, y, bold, 9)
    drawRight('GESAMTPREIS', colGesamtRight, y, bold, 9)
    y -= 22
  }

  drawTableHeader()

  const addContinuationPage = () => {
    page = doc.addPage(PAGE_SIZE)
    y = 780
    drawTableHeader()
  }

  for (const item of input.items) {
    if (y < 120) addContinuationPage()

    const label = item.bezeichnung.length > 48 ? `${item.bezeichnung.slice(0, 47)}…` : item.bezeichnung
    draw(String(item.pos), colPos, y, { size: 9 })
    draw(label, colBezeichnung, y, { size: 9 })
    draw(item.menge.toLocaleString('de-DE'), colMenge, y, { size: 9 })
    drawRight(fmtEuro(item.ep), colEpRight, y, font, 9)
    drawRight(fmtEuro(item.gesamt), colGesamtRight, y, font, 9)
    y -= 18
  }

  if (y < 150) addContinuationPage()

  y -= 4
  page.drawLine({ start: { x: MARGIN_X, y }, end: { x: CONTENT_RIGHT, y }, thickness: 0.75, color: rgb(0.1, 0.1, 0.1) })
  y -= 22

  const summaryLabelX = colEpRight - 130

  const gesamtLabel = input.ustPflichtig ? 'Gesamtbetrag netto:' : 'GESAMTBETRAG'
  draw(gesamtLabel, summaryLabelX, y, { useBold: true, size: 10 })
  drawRight(fmtEuro(input.totalNet), colGesamtRight, y, bold, 10)
  y -= 18

  if (input.ustPflichtig) {
    const ust = Math.round(input.totalNet * 0.19 * 100) / 100
    draw('zzgl. 19% USt.:', summaryLabelX, y, { size: 9 })
    drawRight(fmtEuro(ust), colGesamtRight, y, font, 9)
    y -= 16
    draw('Gesamtbetrag brutto:', summaryLabelX, y, { useBold: true, size: 10 })
    drawRight(fmtEuro(input.totalNet + ust), colGesamtRight, y, bold, 10)
    y -= 30
  } else {
    y -= 6
    draw('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', MARGIN_X, y, { size: 9 })
    y -= 24
  }

  draw('Bitte zahlen Sie die Rechnung bis zum oben angegebenen Fälligkeitsdatum.', MARGIN_X, y, { size: 9 })
  y -= 36

  draw('Freundliche Grüße', MARGIN_X, y, { size: 10 })
  y -= 32
  draw(cs.inhaber ?? cs.company_name, MARGIN_X, y, { size: 10 })

  // ── Fußzeile: dreispaltig (Absender / Kontakt / Bankverbindung) ──
  const footerPage: PDFPage = page
  const footerTop = 96
  footerPage.drawLine({ start: { x: MARGIN_X, y: footerTop }, end: { x: CONTENT_RIGHT, y: footerTop }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })

  const footerCol = (x: number, heading: string, lines: (string | null)[]) => {
    let fy = footerTop - 16
    footerPage.drawText(heading, { x, y: fy, size: 8, font: bold as PDFFont, color: rgb(0.15, 0.15, 0.15) })
    fy -= 12
    for (const line of lines.filter((l): l is string => !!l)) {
      footerPage.drawText(line, { x, y: fy, size: 8, font: font as PDFFont, color: rgb(0.4, 0.4, 0.4) })
      fy -= 12
    }
  }

  const colWidth = (CONTENT_RIGHT - MARGIN_X) / 3
  footerCol(MARGIN_X, cs.company_name, [cs.address_street, [cs.address_zip, cs.address_city].filter(Boolean).join(' '), cs.address_country, cs.steuernummer ? `Steuer Nr. ${cs.steuernummer}` : null])
  footerCol(MARGIN_X + colWidth, 'Kontaktinformationen', [cs.inhaber, cs.phone ? `Tel.: ${cs.phone}` : null, cs.email ? `Mail: ${cs.email}` : null, cs.website])
  footerCol(MARGIN_X + colWidth * 2, 'Bankverbindung', [cs.inhaber, cs.bank_name, cs.iban ? `IBAN: ${cs.iban}` : null, cs.bic ? `BIC: ${cs.bic}` : null])

  return doc.save()
}
