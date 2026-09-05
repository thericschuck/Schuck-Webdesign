import * as financeDomain from './finance'
import * as offersDomain from './offers'
import { OVERDUE_DAYS } from '@/lib/pdf/shared'

/**
 * Angebote und Rechnungen als eine gemeinsame Liste.
 *
 * Beide sind aus Sicht der Liste dasselbe: Nummer, Empfänger, Betrag, Status,
 * Datum, Frist. Sie in getrennten Ansichten zu führen hat den Finanzen-Bereich
 * unnötig aufgeteilt — die Detailseiten bleiben getrennt, weil sich die
 * Lebenszyklen unterscheiden (GoBD-Unveränderlichkeit nur bei Rechnungen).
 *
 * Die Zusammenführung passiert bewusst hier und nicht per SQL-UNION: beide
 * Domänen haben eigene Anzeige-Namensregeln (Snapshot > Kunde > Lead), die
 * sonst dupliziert werden müssten.
 */

export type BelegTyp = 'angebot' | 'rechnung'

/** Vereinheitlichter Status über beide Dokumentarten. */
export type BelegStatus =
  | 'entwurf'
  | 'offen'
  | 'bezahlt'
  | 'angenommen'
  | 'abgelehnt'
  | 'storniert'

export interface BelegRow {
  id: string
  typ: BelegTyp
  nummer: string | null
  empfaenger: string
  betrag: number
  status: BelegStatus
  /** Rechnungsdatum bzw. Erstelldatum des Angebots. */
  datum: string | null
  /** Fälligkeit (Rechnung) bzw. „gültig bis" (Angebot). */
  frist: string | null
  ueberfaellig: boolean
  isTest: boolean
  href: string
}

/** ISO-Datum + n Tage. */
function plusTage(iso: string, tage: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + tage)
  return d.toISOString().slice(0, 10)
}

const RECHNUNG_STATUS: Record<string, BelegStatus> = {
  entwurf: 'entwurf',
  versendet: 'offen',
  bezahlt: 'bezahlt',
  storniert: 'storniert',
}

const ANGEBOT_STATUS: Record<string, BelegStatus> = {
  entwurf: 'entwurf',
  gesendet: 'offen',
  angenommen: 'angenommen',
  abgelehnt: 'abgelehnt',
}

export interface ListBelegeFilter {
  /** Default: Testrechnungen sind ausgeblendet. */
  includeTest?: boolean
}

export async function listBelege(filter: ListBelegeFilter = {}): Promise<BelegRow[]> {
  const [invoices, offers] = await Promise.all([
    financeDomain.listInvoices({ includeTest: true }),
    offersDomain.listOffers(),
  ])

  const heute = new Date().toISOString().slice(0, 10)

  const rechnungen: BelegRow[] = invoices
    .filter((inv) => filter.includeTest || !inv.is_test)
    .map((inv) => {
      const faellig = inv.invoice_date ? plusTage(inv.invoice_date, OVERDUE_DAYS) : null
      return {
        id: inv.id,
        typ: 'rechnung' as const,
        nummer: inv.invoice_number,
        empfaenger: inv.client_display_name,
        betrag: inv.total_net,
        status: RECHNUNG_STATUS[inv.status] ?? 'entwurf',
        datum: inv.invoice_date ?? inv.created_at.slice(0, 10),
        frist: faellig,
        ueberfaellig: inv.status === 'versendet' && Boolean(faellig && faellig < heute),
        isTest: inv.is_test,
        href: `/admin/finanzen/rechnungen/${inv.id}`,
      }
    })

  const angebote: BelegRow[] = offers.map((offer) => ({
    id: offer.id,
    typ: 'angebot' as const,
    nummer: offer.offer_number,
    empfaenger: offer.client_display_name,
    betrag: offer.total_net ?? 0,
    status: ANGEBOT_STATUS[offer.status] ?? 'entwurf',
    datum: offer.created_at?.slice(0, 10) ?? null,
    frist: offer.valid_until,
    // Ein offenes Angebot, dessen Gültigkeit abgelaufen ist, verdient dieselbe
    // Aufmerksamkeit wie eine überfällige Rechnung.
    ueberfaellig: offer.status === 'gesendet' && Boolean(offer.valid_until && offer.valid_until < heute),
    isTest: false,
    href: `/admin/finanzen/angebote/${offer.id}`,
  }))

  return [...rechnungen, ...angebote].sort((a, b) => (b.datum ?? '').localeCompare(a.datum ?? ''))
}
