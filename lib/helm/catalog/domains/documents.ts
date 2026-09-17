import { z } from 'zod'
import { defineTool, type HelmToolDef } from '../types'
import * as documentsDomain from '@/lib/domain/documents'
import type { DocumentTemplate } from '@/lib/domain/documents'
import type { DocumentCategory } from '@/types/database'

const DOCUMENT_TEMPLATE_VALUES = documentsDomain.DOCUMENT_TEMPLATES
// generate_document deckt die 4 "klassischen" Templates ab — care_report hat mit create_care_report
// ein eigenes, dediziertes Tool (braucht "monat" statt project_id/offer_id), um Claude nicht zwei
// überlappende Wege für dasselbe Template anzubieten.
const GENERATE_DOCUMENT_TEMPLATE_VALUES = DOCUMENT_TEMPLATE_VALUES.filter(
  (t) => t !== 'care_report'
) as unknown as [DocumentTemplate, ...DocumentTemplate[]]

const DOCUMENT_CATEGORY_VALUES: [string, ...string[]] = [
  'contract',
  'invoice',
  'briefing',
  'handover',
  'offer',
  'care_report',
  'other',
]

// ── list_documents ────────────────────────────────────────────────────────

const listDocuments = defineTool({
  slug: 'list_documents',
  label: 'Dokumente auflisten',
  description: 'Listet Dokumente eines Kunden oder Projekts, optional gefiltert nach Kategorie.',
  requiresConfirmation: false,
  schema: z.object({
    client_id: z.string().optional().describe('UUID des Kunden (optional).'),
    project_id: z.string().optional().describe('UUID des Projekts (optional).'),
    category: z.enum(DOCUMENT_CATEGORY_VALUES).optional().describe('Optionaler Filter nach Kategorie.'),
  }),
  async execute(args) {
    return documentsDomain.listDocuments({
      clientId: args.client_id,
      projectId: args.project_id,
      category: (args.category as DocumentCategory | undefined) ?? undefined,
    })
  },
})

// ── generate_document ─────────────────────────────────────────────────────

const generateDocument = defineTool({
  slug: 'generate_document',
  label: 'Dokument erzeugen',
  description:
    'Erzeugt ein PDF-Dokument aus einem der 4 Templates (Angebot, Vertrag, Briefing-Protokoll, Übergabe-Dokument), ' +
    'vorbefüllt mit Kunden-/Projekt-/Angebotsdaten, und legt es im Dokumenten-System ab. ' +
    'Für template "angebot" ist offer_id erforderlich. Es wird noch nichts versendet.',
  requiresConfirmation: false,
  schema: z.object({
    template: z.enum(GENERATE_DOCUMENT_TEMPLATE_VALUES).describe('Welches Template erzeugt werden soll.'),
    client_id: z.string().describe('UUID des Kunden (clients.id).'),
    project_id: z.string().optional().describe('UUID des Projekts (optional, außer für den Kontext hilfreich).'),
    offer_id: z.string().optional().describe('UUID des Angebots — erforderlich für template "angebot".'),
  }),
  async execute(args) {
    return documentsDomain.generateDocument({
      template: args.template,
      clientId: args.client_id,
      projectId: args.project_id ?? null,
      offerId: args.offer_id ?? null,
    })
  },
})

// ── create_care_report ────────────────────────────────────────────────────

const createCareReport = defineTool({
  slug: 'create_care_report',
  label: 'Care-Report erzeugen',
  description:
    'Erzeugt den monatlichen Care-Report für einen Kunden (Uptime, Performance, SEO, Telefonbot-Stats, Bewertungen) ' +
    'als PDF und legt es im Dokumenten-System ab. Nicht konfigurierte Dienste erscheinen im Report ehrlich als ' +
    '"nicht verfügbar" statt erfundener Werte. Es wird noch nichts versendet — dafür send_document verwenden.',
  requiresConfirmation: false,
  schema: z.object({
    client_id: z.string().describe('UUID des Kunden (clients.id).'),
    monat: z.string().optional().describe('Berichtsmonat, Format YYYY-MM (optional, Default: laufender Monat).'),
  }),
  async execute(args) {
    return documentsDomain.generateDocument({
      template: 'care_report',
      clientId: args.client_id,
      month: args.monat ?? null,
    })
  },
})

// ── send_document ─────────────────────────────────────────────────────────

const sendDocument = defineTool({
  slug: 'send_document',
  label: 'Dokument versenden',
  description:
    'Versendet ein bereits erzeugtes Dokument per E-Mail als PDF-Anhang. Ohne "to" wird die hinterlegte ' +
    'Portal-E-Mail des Kunden verwendet. Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    document_id: z.string().describe('UUID des Dokuments (documents.id).'),
    to: z.string().optional().describe('Empfänger-E-Mail (optional, Default: Kunden-E-Mail).'),
    subject: z.string().optional().describe('Betreff (optional).'),
    message: z.string().optional().describe('Nachrichtentext (optional).'),
  }),
  summarize: (args) => `Dokument ${args.document_id} per E-Mail versenden${args.to ? ` an ${args.to}` : ''}.`,
  async execute(args) {
    return documentsDomain.sendDocument({
      documentId: args.document_id,
      to: args.to,
      subject: args.subject,
      message: args.message,
    })
  },
})

// ── delete_document ───────────────────────────────────────────────────────

const deleteDocument = defineTool({
  slug: 'delete_document',
  label: 'Dokument löschen',
  description: 'Löscht ein Dokument unwiderruflich aus Datenbank und Storage. Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    document_id: z.string().describe('UUID des Dokuments (documents.id).'),
  }),
  summarize: (args) => `Dokument ${args.document_id} unwiderruflich löschen (Datenbank + Storage).`,
  async execute(args) {
    await documentsDomain.deleteDocument(args.document_id)
    return { deleted: true }
  },
})

export const documentTools: HelmToolDef[] = [
  listDocuments,
  generateDocument,
  createCareReport,
  sendDocument,
  deleteDocument,
]
