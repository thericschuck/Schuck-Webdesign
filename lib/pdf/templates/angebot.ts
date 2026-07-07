import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { CompanySettings } from '@/types/database'
import { PAGE_SIZE, MARGIN_X, fmtEuro, fmtDate } from '../shared'
import { clientDisplayName, clientDisplaySubtitle } from '@/lib/client-name'

export interface AngebotPdfItem {
  pos: number
  bezeichnung: string
  menge: number
  ep: number
  gesamt: number
}

export interface AngebotPdfClient {
  full_name: string | null
  contact_name: string | null
  company_name: string | null
  client_number: string | null
  address_street: string | null
  address_zip: string | null
  address_city: string | null
  address_country: string | null
}

export interface AngebotPdfInput {
  offerNumber: string
  createdAt: string
  validUntil: string | null
  totalNet: number
  items: AngebotPdfItem[]
  client: AngebotPdfClient
  companySettings: CompanySettings
}

/** Angebots-PDF — gleiches Layout wie lib/pdf/invoice.ts, ohne USt-Ausweis (netto, sofern nicht anders vereinbart). */
export async function generateAngebotPdf(input: AngebotPdfInput): Promise<Uint8Array> {
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

  draw(clientDisplayName(input.client.full_name, input.client.contact_name, input.client.company_name), MARGIN_X, y, { useBold: true, size: 11 })
  y -= 14
  const angebotClientSubtitle = clientDisplaySubtitle(input.client.full_name, input.client.contact_name, input.client.company_name)
  if (angebotClientSubtitle) {
    draw(angebotClientSubtitle, MARGIN_X, y, { size: 9, gray: true })
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

  const rightX = 340
  let yMeta = 780
  draw('ANGEBOT', rightX, yMeta, { useBold: true, size: 16 })
  yMeta -= 26

  const metaLine = (label: string, value: string) => {
    draw(`${label}:`, rightX, yMeta, { size: 9, gray: true })
    draw(value, rightX + 90, yMeta, { size: 9 })
    yMeta -= 14
  }

  metaLine('Angebotsnr.', input.offerNumber)
  metaLine('Erstellt am', fmtDate(input.createdAt))
  if (input.validUntil) metaLine('Gültig bis', fmtDate(input.validUntil))
  if (input.client.client_number) metaLine('Kundennummer', input.client.client_number)

  y = Math.min(y, yMeta) - 36

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

  draw(
    cs.ust_pflichtig ? 'Alle Preise verstehen sich netto, zzgl. der gesetzlichen Umsatzsteuer.' : 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.',
    MARGIN_X,
    y,
    { size: 9 }
  )
  y -= 14
  if (input.validUntil) {
    draw(`Dieses Angebot ist gültig bis ${fmtDate(input.validUntil)}.`, MARGIN_X, y, { size: 9 })
    y -= 14
  }

  const footerParts = [
    cs.iban ? `IBAN: ${cs.iban}` : null,
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
