import type { PDFFont } from 'pdf-lib'

export const PAGE_SIZE: [number, number] = [595.28, 841.89] // A4 in Punkten
export const MARGIN_X = 56

/** Kein `due_date`-Feld im invoices-Schema — für die "überfällig"-Kachel im Dashboard
 * (lib/domain/finance.ts) UND für das "Fälligkeitsdatum" auf dem Rechnungs-PDF
 * (lib/pdf/invoice.ts) wird einheitlich ein Zahlungsziel von 14 Tagen ab Rechnungsdatum
 * angenommen. Lebt hier (Leaf-Modul) statt in finance.ts, das selbst generateInvoicePdf
 * importiert — sonst Zirkelbezug. */
export const OVERDUE_DAYS = 14

/** Datum als ISO-String (YYYY-MM-DD) + n Tage, ohne Zeitzonen-Drift (reine Datumsarithmetik). */
export function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function fmtEuro(n: number) {
  return `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Greedy Word-Wrap anhand der tatsächlichen Zeichenbreite (respektiert \n als Absatzumbruch). */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    if (paragraph.trim() === '') {
      lines.push('')
      continue
    }
    const words = paragraph.split(' ')
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(current)
        current = word
      } else {
        current = candidate
      }
    }
    if (current) lines.push(current)
  }
  return lines
}
