import { z } from 'zod'
import { defineTool, type HelmToolDef } from '../types'
import * as financeDomain from '@/lib/domain/finance'
import type { InvoiceStatus } from '@/types/database'

const INVOICE_STATUS_VALUES = financeDomain.INVOICE_STATUS_VALUES as unknown as [string, ...string[]]

// ── list_invoices ─────────────────────────────────────────────────────────────

const listInvoices = defineTool({
  slug: 'list_invoices',
  label: 'Rechnungen auflisten',
  description: 'Listet Rechnungen, optional gefiltert nach Status, Kunde oder Zeitraum (Rechnungsdatum).',
  requiresConfirmation: false,
  schema: z.object({
    status: z.enum(INVOICE_STATUS_VALUES).optional().describe('Optionaler Filter nach Status.'),
    client_id: z.string().optional().describe('UUID des Kunden (optional).'),
    from_date: z.string().optional().describe('Format YYYY-MM-DD (optional).'),
    to_date: z.string().optional().describe('Format YYYY-MM-DD (optional).'),
  }),
  async execute(args) {
    return financeDomain.listInvoices({
      status: (args.status as InvoiceStatus | undefined) ?? undefined,
      clientId: args.client_id,
      fromDate: args.from_date,
      toDate: args.to_date,
    })
  },
})

// ── create_invoice ──────────────────────────────────────────────────────────

const invoiceItemSchema = z.object({
  art_nr: z.string().optional().describe('Artikelnummer (optional, falls Position auf einen Katalogartikel verweist).'),
  bezeichnung: z.string().optional().describe('Freitext-Bezeichnung, überschreibt Artikelname (optional).'),
  menge: z.number().optional().describe('Menge, Default 1.'),
  ep: z.number().describe('Einzelpreis (netto).'),
})

const createInvoiceSchema = z.object({
  client_id: z.string().describe('UUID des Kunden (clients.id).'),
  project_id: z.string().optional().describe('UUID des Projekts (optional).'),
  service_date: z.string().optional().describe('Leistungsdatum, Format YYYY-MM-DD (optional).'),
  items: z.array(invoiceItemSchema).min(1).describe('Rechnungspositionen.'),
})

const createInvoice = defineTool({
  slug: 'create_invoice',
  label: 'Rechnungsentwurf anlegen',
  description:
    'Legt einen Rechnungsentwurf aus Artikeln/Freitext-Positionen an. Es wird noch KEINE Rechnungsnummer vergeben — ' +
    'das passiert erst beim Stellen (issue_invoice). Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: createInvoiceSchema,
  summarize: (args) =>
    `Rechnungsentwurf für Kunde ${args.client_id} anlegen (${args.items.length} Position${args.items.length === 1 ? '' : 'en'}).`,
  async execute(args) {
    return financeDomain.createInvoiceDraft({
      clientId: args.client_id,
      projectId: args.project_id ?? null,
      serviceDate: args.service_date ?? null,
      items: args.items.map((item) => ({
        artNr: item.art_nr,
        bezeichnung: item.bezeichnung,
        menge: item.menge,
        ep: item.ep,
      })),
    })
  },
})

// ── issue_invoice ───────────────────────────────────────────────────────────

const issueInvoice = defineTool({
  slug: 'issue_invoice',
  label: 'Rechnung stellen',
  description:
    'Stellt eine Rechnung: vergibt die fortlaufende RE-Nummer (Scope Jahr) und erzeugt das PDF — ' +
    'Nummer und Statuswechsel geschehen atomar, danach ist die Rechnung GoBD-unveränderlich. Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    invoice_id: z.string().describe('UUID der Rechnung (invoices.id).'),
  }),
  summarize: (args) => `Rechnung ${args.invoice_id} stellen (vergibt die RE-Nummer, danach unveränderlich).`,
  async execute(args) {
    return financeDomain.issueInvoice(args.invoice_id)
  },
})

// ── send_invoice ──────────────────────────────────────────────────────────

const sendInvoice = defineTool({
  slug: 'send_invoice',
  label: 'Rechnung versenden',
  description:
    'Versendet das PDF einer bereits gestellten Rechnung per E-Mail und setzt sent_at. Ohne "to" wird die ' +
    'hinterlegte Portal-E-Mail des Kunden verwendet. Ein erneuter Versand derselben Rechnung ist nicht möglich ' +
    '(sent_at ist nach dem ersten Versand unveränderlich). Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    invoice_id: z.string().describe('UUID der Rechnung (invoices.id).'),
    to: z.string().optional().describe('Empfänger-E-Mail (optional, Default: Kunden-E-Mail).'),
  }),
  summarize: (args) => `Rechnung ${args.invoice_id} per E-Mail versenden${args.to ? ` an ${args.to}` : ''}.`,
  async execute(args) {
    return financeDomain.sendInvoice(args.invoice_id, args.to)
  },
})

// ── send_payment_reminder ─────────────────────────────────────────────────────

const sendPaymentReminder = defineTool({
  slug: 'send_payment_reminder',
  label: 'Zahlungserinnerung versenden',
  description:
    'Verschickt eine Zahlungserinnerung (Mahnung) für eine bereits gestellte, noch offene Rechnung — hängt das ' +
    'Rechnungs-PDF erneut an. Mehrfacher Versand ist erlaubt (1., 2. Mahnung). Ohne "to" wird die hinterlegte ' +
    'Portal-E-Mail des Kunden verwendet. Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    invoice_id: z.string().describe('UUID der Rechnung (invoices.id).'),
    to: z.string().optional().describe('Empfänger-E-Mail (optional, Default: Kunden-E-Mail).'),
  }),
  summarize: (args) => `Zahlungserinnerung für Rechnung ${args.invoice_id} versenden${args.to ? ` an ${args.to}` : ''}.`,
  async execute(args) {
    return financeDomain.sendPaymentReminder(args.invoice_id, args.to)
  },
})

// ── update_invoice_status ────────────────────────────────────────────────────

const updateInvoiceStatus = defineTool({
  slug: 'update_invoice_status',
  label: 'Rechnungsstatus ändern',
  description: 'Setzt den Status einer gestellten Rechnung auf bezahlt oder storniert. Nur der Übergang von "versendet" aus ist erlaubt (GoBD).',
  requiresConfirmation: false,
  schema: z.object({
    invoice_id: z.string().describe('UUID der Rechnung (invoices.id).'),
    status: z.enum(['bezahlt', 'storniert']).describe('Neuer Status.'),
  }),
  async execute(args) {
    return financeDomain.updateInvoiceStatus(args.invoice_id, args.status)
  },
})

// ── create_credit_note ────────────────────────────────────────────────────────

const createCreditNote = defineTool({
  slug: 'create_credit_note',
  label: 'Gutschrift erstellen',
  description:
    'Erstellt eine Gutschrift zu einer gestellten Rechnung und vergibt die GS-Nummer (Scope Jahr). ' +
    'GoBD: Korrekturen an gestellten Rechnungen erfolgen ausschließlich über Gutschriften, niemals durch nachträgliches Ändern. Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    invoice_id: z.string().describe('UUID der Rechnung (invoices.id).'),
    reason: z.string().optional().describe('Grund der Gutschrift (optional).'),
    total_net: z.number().describe('Gutschriftsbetrag netto.'),
  }),
  summarize: (args) => `Gutschrift über ${args.total_net} € (netto) zu Rechnung ${args.invoice_id} erstellen.`,
  async execute(args) {
    return financeDomain.createCreditNote({
      invoiceId: args.invoice_id,
      reason: args.reason ?? null,
      totalNet: args.total_net,
    })
  },
})

// ── get_revenue_overview ──────────────────────────────────────────────────────

const getRevenueOverview = defineTool({
  slug: 'get_revenue_overview',
  label: 'Umsatzübersicht abrufen',
  description:
    'Liefert Umsatzzahlen (Monat/Jahr/offen/überfällig, Verlauf pro Monat) sowie Aufschlüsselung nach Kunde und Artikel-Kategorie. ' +
    'Default-Zeitraum: 1. Januar des laufenden Jahres bis heute — für Quartalszahlen from_date/to_date entsprechend setzen.',
  requiresConfirmation: false,
  schema: z.object({
    from_date: z.string().optional().describe('Format YYYY-MM-DD (optional).'),
    to_date: z.string().optional().describe('Format YYYY-MM-DD (optional).'),
  }),
  async execute(args) {
    return financeDomain.getRevenueOverview({ fromDate: args.from_date, toDate: args.to_date })
  },
})

export const financeTools: HelmToolDef[] = [
  listInvoices,
  createInvoice,
  issueInvoice,
  sendInvoice,
  sendPaymentReminder,
  updateInvoiceStatus,
  createCreditNote,
  getRevenueOverview,
]
