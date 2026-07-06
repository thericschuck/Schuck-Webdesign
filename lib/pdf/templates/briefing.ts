import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { CompanySettings } from '@/types/database'
import { PAGE_SIZE, MARGIN_X, fmtDate, wrapText } from '../shared'
import { clientDisplayName } from '@/lib/client-name'

const CONTENT_WIDTH = 539 - MARGIN_X

export interface BriefingPdfInput {
  client: { full_name: string | null; company_name: string | null; client_number: string | null }
  createdAt: string
  projectTitle?: string | null
  projectDescription?: string | null
  participants?: string[]
  companySettings: CompanySettings
}

/** Briefing-Protokoll — Kopf mit bekannten Daten vorbefüllt, offene Abschnitte als ausfüllbare Linien. */
export async function generateBriefingPdf(input: BriefingPdfInput): Promise<Uint8Array> {
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

  /** Leere Linien zum handschriftlichen/nachträglichen Ausfüllen. */
  function blankLines(count: number) {
    for (let i = 0; i < count; i++) {
      ensureSpace(2)
      page.drawLine({
        start: { x: MARGIN_X, y },
        end: { x: 539, y },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      })
      y -= 22
    }
    y -= 4
  }

  // ── Kopf ──
  draw('BRIEFING-PROTOKOLL', MARGIN_X, y, { useBold: true, size: 18 })
  y -= 30

  const metaLine = (label: string, value: string) => {
    draw(`${label}:`, MARGIN_X, y, { size: 9, gray: true })
    draw(value, MARGIN_X + 100, y, { size: 9 })
    y -= 16
  }

  const briefingClientName = clientDisplayName(input.client.full_name, input.client.company_name)
  metaLine('Datum', fmtDate(input.createdAt))
  metaLine('Kunde', briefingClientName)
  if (input.projectTitle) metaLine('Projekt', input.projectTitle)
  metaLine(
    'Teilnehmer',
    input.participants && input.participants.length > 0 ? input.participants.join(', ') : `${cs.company_name}, ${briefingClientName}`
  )
  y -= 14

  // ── Ausgangslage ──
  heading('Ausgangslage / Projektbeschreibung')
  if (input.projectDescription) {
    paragraph(input.projectDescription)
  } else {
    blankLines(3)
  }

  heading('Ziele des Projekts')
  blankLines(3)

  heading('Zielgruppe')
  blankLines(2)

  heading('Design-Präferenzen')
  blankLines(3)

  heading('Funktionsumfang')
  blankLines(4)

  heading('Offene Punkte / Nächste Schritte')
  blankLines(3)

  return doc.save()
}
