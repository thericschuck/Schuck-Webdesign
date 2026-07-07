import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { CompanySettings } from '@/types/database'
import { PAGE_SIZE, MARGIN_X, fmtDate, wrapText } from '../shared'
import { clientDisplayName } from '@/lib/client-name'
import type { CareReportData } from '@/lib/domain/care'

const CONTENT_WIDTH = 539 - MARGIN_X

export interface CareReportPdfInput {
  client: { full_name: string | null; contact_name: string | null; company_name: string | null; client_number: string | null }
  createdAt: string
  data: CareReportData
  companySettings: CompanySettings
}

/** Monatlicher Care-Report — Uptime/Performance/SEO/Telefonbot/Bewertungen, fehlende Abschnitte werden ehrlich als "nicht verfügbar" markiert. */
export async function generateCareReportPdf(input: CareReportPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

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

  function paragraph(text: string, size = 10, gray = false) {
    for (const line of wrapText(text, font, size, CONTENT_WIDTH)) {
      ensureSpace(1)
      draw(line, MARGIN_X, y, { size, gray })
      y -= 14
    }
    y -= 6
  }

  function metric(label: string, value: string) {
    ensureSpace(1)
    draw(`${label}:`, MARGIN_X, y, { size: 10, gray: true })
    draw(value, MARGIN_X + 180, y, { size: 10 })
    y -= 16
  }

  function unavailable(reason?: string) {
    paragraph(`Keine Daten verfügbar${reason ? ` (${reason})` : ''}.`, 9, true)
  }

  const clientName = clientDisplayName(input.client.full_name, input.client.contact_name, input.client.company_name)

  // ── Kopf ──
  draw('CARE-REPORT', MARGIN_X, y, { useBold: true, size: 18 })
  y -= 30
  const metaLine = (label: string, value: string) => {
    draw(`${label}:`, MARGIN_X, y, { size: 9, gray: true })
    draw(value, MARGIN_X + 100, y, { size: 9 })
    y -= 16
  }
  metaLine('Erstellt am', fmtDate(input.createdAt))
  metaLine('Kunde', clientName)
  metaLine('Zeitraum', input.data.month)
  y -= 14

  // ── Uptime ──
  heading('Uptime')
  if (input.data.uptime.available && input.data.uptime.data) {
    metric('Status', input.data.uptime.data.status)
    metric('Uptime (30 Tage)', input.data.uptime.data.uptimeRatio30d ? `${input.data.uptime.data.uptimeRatio30d}%` : 'n/a')
  } else {
    unavailable(input.data.uptime.reason)
  }

  // ── Performance ──
  heading('Performance (PageSpeed)')
  if (input.data.performance.available && input.data.performance.data) {
    metric('Performance-Score', input.data.performance.data.score !== null ? `${input.data.performance.data.score}/100` : 'n/a')
    metric('Largest Contentful Paint', input.data.performance.data.lcp ?? 'n/a')
    metric('Cumulative Layout Shift', input.data.performance.data.cls ?? 'n/a')
  } else {
    unavailable(input.data.performance.reason)
  }

  // ── SEO ──
  heading('SEO (Search Console)')
  if (input.data.seo.available && input.data.seo.data) {
    if (input.data.seo.data.rows.length === 0) {
      paragraph('Keine Suchanfragen im Zeitraum erfasst.', 9, true)
    } else {
      for (const row of input.data.seo.data.rows.slice(0, 5)) {
        metric(row.keys.join(', '), `${row.clicks} Klicks, ${row.impressions} Impressionen`)
      }
    }
  } else {
    unavailable(input.data.seo.reason)
  }

  // ── Telefonbot ──
  heading('Telefonbot (Vapi)')
  if (input.data.callBot.available && input.data.callBot.data) {
    metric('Anrufe gesamt', String(input.data.callBot.data.totalCalls))
    metric('Kosten gesamt', `${input.data.callBot.data.totalCost.toFixed(2)} USD`)
    metric('Ø Dauer', input.data.callBot.data.averageDurationSeconds !== null ? `${input.data.callBot.data.averageDurationSeconds}s` : 'n/a')
  } else {
    unavailable(input.data.callBot.reason)
  }

  // ── Bewertungen ──
  heading('Bewertungen (Google Business Profile)')
  if (input.data.reviews.available && input.data.reviews.data) {
    metric('Ø Bewertung', input.data.reviews.data.averageRating !== null ? `${input.data.reviews.data.averageRating.toFixed(1)}/5` : 'n/a')
    metric('Anzahl Bewertungen', String(input.data.reviews.data.totalReviewCount))
  } else {
    unavailable(input.data.reviews.reason)
  }

  return doc.save()
}
