import type { JarvisTool } from '../tool-types'
import { optionalNumber, optionalString, requireString } from './helpers'
import * as financeDomain from '@/lib/domain/finance'
import type { InvoiceStatus } from '@/types/database'

const INVOICE_STATUS_VALUES = financeDomain.INVOICE_STATUS_VALUES

// ── list_invoices ─────────────────────────────────────────────────────────────

const listInvoices: JarvisTool = {
  name: 'list_invoices',
  requiresConfirmation: false,
  definition: {
    name: 'list_invoices',
    description: 'Listet Rechnungen, optional gefiltert nach Status, Kunde oder Zeitraum (Rechnungsdatum).',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: INVOICE_STATUS_VALUES, description: 'Optionaler Filter nach Status.' },
        client_id: { type: 'string', description: 'UUID des Kunden (optional).' },
        from_date: { type: 'string', description: 'Format YYYY-MM-DD (optional).' },
        to_date: { type: 'string', description: 'Format YYYY-MM-DD (optional).' },
      },
    },
  },
  async execute(args) {
    return financeDomain.listInvoices({
      status: (optionalString(args, 'status') as InvoiceStatus | null) ?? undefined,
      clientId: optionalString(args, 'client_id') ?? undefined,
      fromDate: optionalString(args, 'from_date') ?? undefined,
      toDate: optionalString(args, 'to_date') ?? undefined,
    })
  },
}

// ── create_invoice ──────────────────────────────────────────────────────────

interface InvoiceItemArg {
  art_nr?: string
  bezeichnung?: string
  menge?: number
  ep: number
}

function isInvoiceItemArg(value: unknown): value is InvoiceItemArg {
  return typeof value === 'object' && value !== null && typeof (value as InvoiceItemArg).ep === 'number'
}

const createInvoice: JarvisTool = {
  name: 'create_invoice',
  requiresConfirmation: true,
  definition: {
    name: 'create_invoice',
    description:
      'Legt einen Rechnungsentwurf aus Artikeln/Freitext-Positionen an. Es wird noch KEINE Rechnungsnummer vergeben — ' +
      'das passiert erst beim Stellen (issue_invoice). Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'UUID des Kunden (clients.id).' },
        project_id: { type: 'string', description: 'UUID des Projekts (optional).' },
        service_date: { type: 'string', description: 'Leistungsdatum, Format YYYY-MM-DD (optional).' },
        items: {
          type: 'array',
          description: 'Rechnungspositionen.',
          items: {
            type: 'object',
            properties: {
              art_nr: { type: 'string', description: 'Artikelnummer (optional, falls Position auf einen Katalogartikel verweist).' },
              bezeichnung: { type: 'string', description: 'Freitext-Bezeichnung, überschreibt Artikelname (optional).' },
              menge: { type: 'number', description: 'Menge, Default 1.' },
              ep: { type: 'number', description: 'Einzelpreis (netto).' },
            },
            required: ['ep'],
          },
        },
      },
      required: ['client_id', 'items'],
    },
  },
  async execute(args) {
    const rawItems = args.items
    if (!Array.isArray(rawItems) || rawItems.length === 0 || !rawItems.every(isInvoiceItemArg)) {
      throw new Error('items ist erforderlich und muss mindestens eine Position mit ep enthalten.')
    }

    return financeDomain.createInvoiceDraft({
      clientId: requireString(args, 'client_id'),
      projectId: optionalString(args, 'project_id'),
      serviceDate: optionalString(args, 'service_date'),
      items: rawItems.map((item) => ({
        artNr: item.art_nr,
        bezeichnung: item.bezeichnung,
        menge: item.menge,
        ep: item.ep,
      })),
    })
  },
}

// ── issue_invoice ───────────────────────────────────────────────────────────

const issueInvoice: JarvisTool = {
  name: 'issue_invoice',
  requiresConfirmation: true,
  definition: {
    name: 'issue_invoice',
    description:
      'Stellt eine Rechnung: vergibt die fortlaufende RE-Nummer (Scope Jahr) und erzeugt das PDF — ' +
      'Nummer und Statuswechsel geschehen atomar, danach ist die Rechnung GoBD-unveränderlich. Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: { type: 'string', description: 'UUID der Rechnung (invoices.id).' },
      },
      required: ['invoice_id'],
    },
  },
  async execute(args) {
    return financeDomain.issueInvoice(requireString(args, 'invoice_id'))
  },
}

// ── send_invoice ──────────────────────────────────────────────────────────

const sendInvoice: JarvisTool = {
  name: 'send_invoice',
  requiresConfirmation: true,
  definition: {
    name: 'send_invoice',
    description:
      'Versendet das PDF einer bereits gestellten Rechnung per E-Mail und setzt sent_at. Ohne "to" wird die ' +
      'hinterlegte Portal-E-Mail des Kunden verwendet. Ein erneuter Versand derselben Rechnung ist nicht möglich ' +
      '(sent_at ist nach dem ersten Versand unveränderlich). Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: { type: 'string', description: 'UUID der Rechnung (invoices.id).' },
        to: { type: 'string', description: 'Empfänger-E-Mail (optional, Default: Kunden-E-Mail).' },
      },
      required: ['invoice_id'],
    },
  },
  async execute(args) {
    return financeDomain.sendInvoice(requireString(args, 'invoice_id'), optionalString(args, 'to') ?? undefined)
  },
}

// ── update_invoice_status ────────────────────────────────────────────────────

const updateInvoiceStatus: JarvisTool = {
  name: 'update_invoice_status',
  requiresConfirmation: false,
  definition: {
    name: 'update_invoice_status',
    description:
      'Setzt den Status einer gestellten Rechnung auf bezahlt oder storniert. Nur der Übergang von "versendet" aus ist erlaubt (GoBD).',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: { type: 'string', description: 'UUID der Rechnung (invoices.id).' },
        status: { type: 'string', enum: ['bezahlt', 'storniert'], description: 'Neuer Status.' },
      },
      required: ['invoice_id', 'status'],
    },
  },
  async execute(args) {
    const status = requireString(args, 'status')
    if (status !== 'bezahlt' && status !== 'storniert') {
      throw new Error('status muss "bezahlt" oder "storniert" sein.')
    }
    return financeDomain.updateInvoiceStatus(requireString(args, 'invoice_id'), status)
  },
}

// ── create_credit_note ────────────────────────────────────────────────────────

const createCreditNote: JarvisTool = {
  name: 'create_credit_note',
  requiresConfirmation: true,
  definition: {
    name: 'create_credit_note',
    description:
      'Erstellt eine Gutschrift zu einer gestellten Rechnung und vergibt die GS-Nummer (Scope Jahr). ' +
      'GoBD: Korrekturen an gestellten Rechnungen erfolgen ausschließlich über Gutschriften, niemals durch nachträgliches Ändern. Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: { type: 'string', description: 'UUID der Rechnung (invoices.id).' },
        reason: { type: 'string', description: 'Grund der Gutschrift (optional).' },
        total_net: { type: 'number', description: 'Gutschriftsbetrag netto.' },
      },
      required: ['invoice_id', 'total_net'],
    },
  },
  async execute(args) {
    return financeDomain.createCreditNote({
      invoiceId: requireString(args, 'invoice_id'),
      reason: optionalString(args, 'reason'),
      totalNet: optionalNumber(args, 'total_net') ?? 0,
    })
  },
}

// ── get_revenue_overview ──────────────────────────────────────────────────────

const getRevenueOverview: JarvisTool = {
  name: 'get_revenue_overview',
  requiresConfirmation: false,
  definition: {
    name: 'get_revenue_overview',
    description:
      'Liefert Umsatzzahlen (Monat/Jahr/offen/überfällig, Verlauf pro Monat) sowie Aufschlüsselung nach Kunde und Artikel-Kategorie. ' +
      'Default-Zeitraum: 1. Januar des laufenden Jahres bis heute — für Quartalszahlen from_date/to_date entsprechend setzen.',
    input_schema: {
      type: 'object',
      properties: {
        from_date: { type: 'string', description: 'Format YYYY-MM-DD (optional).' },
        to_date: { type: 'string', description: 'Format YYYY-MM-DD (optional).' },
      },
    },
  },
  async execute(args) {
    return financeDomain.getRevenueOverview({
      fromDate: optionalString(args, 'from_date') ?? undefined,
      toDate: optionalString(args, 'to_date') ?? undefined,
    })
  },
}

export const financeTools: JarvisTool[] = [
  listInvoices,
  createInvoice,
  issueInvoice,
  sendInvoice,
  updateInvoiceStatus,
  createCreditNote,
  getRevenueOverview,
]
