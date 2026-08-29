/**
 * Formatierung + Escaping für den Dokument-Renderer.
 *
 * Eigene Helfer statt `lib/pdf/shared.ts`, weil dieses Modul im Browser laufen
 * können muss — `shared.ts` importiert pdf-lib-Typen.
 */

/** Alles, was aus der DB kommt (Kundennamen, Beschreibungen), läuft hier durch,
 * bevor es ins HTML geht. Ein Firmenname mit `&` oder `<` würde sonst das
 * Dokument zerlegen. */
export function escapeHtml(value: unknown): string {
  if (value == null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function fmtEuro(n: number): string {
  return `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

export function fmtMenge(n: number): string {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 2 })
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** ISO-Datum + n Tage, reine Datumsarithmetik ohne Zeitzonendrift. */
export function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
