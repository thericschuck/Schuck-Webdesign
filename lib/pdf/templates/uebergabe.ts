import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { CompanySettings } from '@/types/database'
import { PAGE_SIZE, MARGIN_X, fmtDate, wrapText } from '../shared'
import { clientDisplayName } from '@/lib/client-name'

const CONTENT_WIDTH = 539 - MARGIN_X

export interface UebergabePdfInput {
  client: { full_name: string | null; company_name: string | null; client_number: string | null }
  createdAt: string
  projectTitle?: string | null
  deliverables?: string[]
  companySettings: CompanySettings
}

const DEFAULT_DELIVERABLES = ['Fertiggestellte Website gemäß vereinbartem Leistungsumfang', 'Übergabe der Zugänge (Hosting, Domain, CMS)', 'Kurzeinweisung in die Verwaltung der Inhalte']

/** Übergabe-Dokument — Checkliste der gelieferten Leistungen + Abnahme-Unterschrift. */
export async function generateUebergabePdf(input: UebergabePdfInput): Promise<Uint8Array> {
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

  // ── Kopf ──
  draw('ÜBERGABE-DOKUMENT', MARGIN_X, y, { useBold: true, size: 18 })
  y -= 30

  const metaLine = (label: string, value: string) => {
    draw(`${label}:`, MARGIN_X, y, { size: 9, gray: true })
    draw(value, MARGIN_X + 100, y, { size: 9 })
    y -= 16
  }
  const uebergabeClientName = clientDisplayName(input.client.full_name, input.client.company_name)
  metaLine('Datum', fmtDate(input.createdAt))
  metaLine('Kunde', uebergabeClientName)
  if (input.projectTitle) metaLine('Projekt', input.projectTitle)
  y -= 14

  // ── Gelieferte Leistungen ──
  heading('Gelieferte Leistungen')
  const deliverables = input.deliverables && input.deliverables.length > 0 ? input.deliverables : DEFAULT_DELIVERABLES
  for (const item of deliverables) bullet(item)
  y -= 6

  // ── Zugangsdaten ──
  heading('Zugangsdaten')
  paragraph(
    'Zugangsdaten (Hosting, Domain, CMS, sonstige Dienste) wurden dem Auftraggeber separat auf sicherem Weg ' +
      'übermittelt (z. B. Passwort-Manager oder verschlüsselte Übertragung). Aus Sicherheitsgründen enthält dieses ' +
      'Dokument keine Zugangsdaten im Klartext.'
  )

  // ── Support & Wartung ──
  heading('Support & Wartung')
  paragraph(
    `Bei Fragen oder Problemen nach der Übergabe steht ${cs.company_name} für Support und Wartung zur Verfügung. ` +
      'Der Umfang etwaiger Wartungsleistungen richtet sich nach dem separat vereinbarten Vertrag bzw. Angebot.'
  )

  // ── Abnahme ──
  heading('Abnahme')
  paragraph(
    'Der Auftraggeber bestätigt mit seiner Unterschrift die vollständige und mangelfreie Übergabe der oben ' +
      'genannten Leistungen.'
  )

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
  draw(`Unterschrift ${uebergabeClientName}`, MARGIN_X, y, { size: 8, gray: true })
  draw(`Unterschrift ${cs.company_name}`, sigRightX, y, { size: 8, gray: true })

  return doc.save()
}
