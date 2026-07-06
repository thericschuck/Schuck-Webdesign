import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { CompanySettings } from '@/types/database'
import { clientDisplayName, clientDisplaySubtitle } from '@/lib/client-name'

const PAGE_SIZE: [number, number] = [595.28, 841.89] // A4 in Punkten
const MARGIN_X = 56

export interface InvoicePdfItem {
  pos: number
  bezeichnung: string
  menge: number
  ep: number
  gesamt: number
}

export interface InvoicePdfClient {
  full_name: string | null
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

function fmtEuro(n: number) {
  return `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Erzeugt Rechnungs-PDFs rein serverseitig mit pdf-lib (kein Headless-Browser,
 * keine nativen Abhängigkeiten) — läuft unverändert in Vercel Serverless
 * Functions. Enthält die GoBD-Pflichtangaben nach § 14 UStG sowie den
 * §19-UStG-Hinweis, wenn ustPflichtig=false (Kleinunternehmerregelung).
 */
export async function generateInvoicePdf(input: InvoicePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  let page = doc.addPage(PAGE_SIZE)
  const cs = input.companySettings

  const draw = (text: string, x: number, y: number, opts: { size?: number; useBold?: boolean; gray?: boolean } = {}) => {
    page.drawText(text, {
      x,
      y,
      size: opts.size ?? 10,
      font: opts.useBold ? bold : font,
      color: opts.gray ? rgb(0.45, 0.45, 0.45) : rgb(0, 0, 0),
    })
  }

  const senderLine = [cs.company_name, cs.address_street, [cs.address_zip, cs.address_city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' · ')

  let y = 780
  draw(senderLine, MARGIN_X, y, { size: 8, gray: true })
  y -= 30

  // ── Empfänger ──
  draw(clientDisplayName(input.client.full_name, input.client.company_name), MARGIN_X, y, { useBold: true, size: 11 })
  y -= 14
  const invoiceClientSubtitle = clientDisplaySubtitle(input.client.full_name, input.client.company_name)
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

  // ── Titel + Metadaten (rechts) ──
  const rightX = 340
  let yMeta = 780
  draw('RECHNUNG', rightX, yMeta, { useBold: true, size: 16 })
  yMeta -= 26

  const metaLine = (label: string, value: string) => {
    draw(`${label}:`, rightX, yMeta, { size: 9, gray: true })
    draw(value, rightX + 90, yMeta, { size: 9 })
    yMeta -= 14
  }

  metaLine('Rechnungsnr.', input.invoiceNumber)
  metaLine('Rechnungsdatum', fmtDate(input.invoiceDate))
  if (input.serviceDate) metaLine('Leistungsdatum', fmtDate(input.serviceDate))
  if (input.client.client_number) metaLine('Kundennummer', input.client.client_number)
  if (input.projectTitle) metaLine('Projekt', input.projectTitle)
  if (cs.steuernummer) metaLine('Steuernummer', cs.steuernummer)
  if (cs.ust_id) metaLine('USt-IdNr.', cs.ust_id)

  y = Math.min(y, yMeta) - 36

  // ── Positionstabelle ──
  const colPos = MARGIN_X
  const colBezeichnung = MARGIN_X + 34
  const colMenge = 355
  const colEp = 415
  const colGesamt = 480

  const drawTableHeader = () => {
    draw('Pos.', colPos, y, { useBold: true, size: 9 })
    draw('Bezeichnung', colBezeichnung, y, { useBold: true, size: 9 })
    draw('Menge', colMenge, y, { useBold: true, size: 9 })
    draw('Einzelpreis', colEp, y, { useBold: true, size: 9 })
    draw('Gesamt', colGesamt, y, { useBold: true, size: 9 })
    y -= 6
    page.drawLine({ start: { x: MARGIN_X, y }, end: { x: 539, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) })
    y -= 14
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
    draw(fmtEuro(item.ep), colEp, y, { size: 9 })
    draw(fmtEuro(item.gesamt), colGesamt, y, { size: 9 })
    y -= 16
  }

  if (y < 150) addContinuationPage()

  y -= 8
  page.drawLine({ start: { x: MARGIN_X, y }, end: { x: 539, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) })
  y -= 22

  draw('Gesamtbetrag netto:', colEp - 40, y, { useBold: true, size: 10 })
  draw(fmtEuro(input.totalNet), colGesamt, y, { useBold: true, size: 10 })
  y -= 16

  if (input.ustPflichtig) {
    const ust = Math.round(input.totalNet * 0.19 * 100) / 100
    draw('zzgl. 19% USt.:', colEp - 40, y, { size: 9 })
    draw(fmtEuro(ust), colGesamt, y, { size: 9 })
    y -= 16
    draw('Gesamtbetrag brutto:', colEp - 40, y, { useBold: true, size: 10 })
    draw(fmtEuro(input.totalNet + ust), colGesamt, y, { useBold: true, size: 10 })
    y -= 30
  } else {
    y -= 6
    draw('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', MARGIN_X, y, { size: 9 })
    y -= 30
  }

  // ── Fußzeile: Bankverbindung / Kontakt ──
  const footerParts = [
    cs.iban ? `IBAN: ${cs.iban}` : null,
    cs.bic ? `BIC: ${cs.bic}` : null,
    cs.email ? `E-Mail: ${cs.email}` : null,
    cs.phone ? `Tel: ${cs.phone}` : null,
  ].filter((v): v is string => v != null)

  if (footerParts.length > 0) {
    const footerPage: PDFPage = page
    footerPage.drawText(footerParts.join('   ·   '), {
      x: MARGIN_X,
      y: 50,
      size: 8,
      font: font as PDFFont,
      color: rgb(0.45, 0.45, 0.45),
    })
  }

  return doc.save()
}
