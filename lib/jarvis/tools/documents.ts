import type { JarvisTool } from '../tool-types'
import { optionalString, requireString } from './helpers'
import * as documentsDomain from '@/lib/domain/documents'
import type { DocumentTemplate } from '@/lib/domain/documents'
import type { DocumentCategory } from '@/types/database'

const DOCUMENT_TEMPLATE_VALUES = documentsDomain.DOCUMENT_TEMPLATES
// generate_document deckt die 4 "klassischen" Templates ab — care_report hat mit create_care_report
// ein eigenes, dediziertes Tool (braucht "monat" statt project_id/offer_id), um Claude nicht zwei
// überlappende Wege für dasselbe Template anzubieten.
const GENERATE_DOCUMENT_TEMPLATE_VALUES: DocumentTemplate[] = DOCUMENT_TEMPLATE_VALUES.filter((t) => t !== 'care_report')

// ── list_documents ────────────────────────────────────────────────────────

const listDocuments: JarvisTool = {
  name: 'list_documents',
  requiresConfirmation: false,
  definition: {
    name: 'list_documents',
    description: 'Listet Dokumente eines Kunden oder Projekts, optional gefiltert nach Kategorie.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'UUID des Kunden (optional).' },
        project_id: { type: 'string', description: 'UUID des Projekts (optional).' },
        category: {
          type: 'string',
          enum: ['contract', 'invoice', 'briefing', 'handover', 'offer', 'care_report', 'other'],
          description: 'Optionaler Filter nach Kategorie.',
        },
      },
    },
  },
  async execute(args) {
    return documentsDomain.listDocuments({
      clientId: optionalString(args, 'client_id') ?? undefined,
      projectId: optionalString(args, 'project_id') ?? undefined,
      category: (optionalString(args, 'category') as DocumentCategory | null) ?? undefined,
    })
  },
}

// ── generate_document ─────────────────────────────────────────────────────

const generateDocument: JarvisTool = {
  name: 'generate_document',
  requiresConfirmation: false,
  definition: {
    name: 'generate_document',
    description:
      'Erzeugt ein PDF-Dokument aus einem der 4 Templates (Angebot, Vertrag, Briefing-Protokoll, Übergabe-Dokument), ' +
      'vorbefüllt mit Kunden-/Projekt-/Angebotsdaten, und legt es im Dokumenten-System ab. ' +
      'Für template "angebot" ist offer_id erforderlich. Es wird noch nichts versendet.',
    input_schema: {
      type: 'object',
      properties: {
        template: { type: 'string', enum: [...GENERATE_DOCUMENT_TEMPLATE_VALUES], description: 'Welches Template erzeugt werden soll.' },
        client_id: { type: 'string', description: 'UUID des Kunden (clients.id).' },
        project_id: { type: 'string', description: 'UUID des Projekts (optional, außer für den Kontext hilfreich).' },
        offer_id: { type: 'string', description: 'UUID des Angebots — erforderlich für template "angebot".' },
      },
      required: ['template', 'client_id'],
    },
  },
  async execute(args) {
    const template = requireString(args, 'template') as DocumentTemplate
    if (!GENERATE_DOCUMENT_TEMPLATE_VALUES.includes(template)) {
      throw new Error(`Ungültiges Template "${template}". Erlaubt: ${GENERATE_DOCUMENT_TEMPLATE_VALUES.join(', ')}.`)
    }
    return documentsDomain.generateDocument({
      template,
      clientId: requireString(args, 'client_id'),
      projectId: optionalString(args, 'project_id'),
      offerId: optionalString(args, 'offer_id'),
    })
  },
}

// ── create_care_report ────────────────────────────────────────────────────

const createCareReport: JarvisTool = {
  name: 'create_care_report',
  requiresConfirmation: false,
  definition: {
    name: 'create_care_report',
    description:
      'Erzeugt den monatlichen Care-Report für einen Kunden (Uptime, Performance, SEO, Telefonbot-Stats, Bewertungen) ' +
      'als PDF und legt es im Dokumenten-System ab. Nicht konfigurierte Dienste erscheinen im Report ehrlich als ' +
      '"nicht verfügbar" statt erfundener Werte. Es wird noch nichts versendet — dafür send_document verwenden.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'UUID des Kunden (clients.id).' },
        monat: { type: 'string', description: 'Berichtsmonat, Format YYYY-MM (optional, Default: laufender Monat).' },
      },
      required: ['client_id'],
    },
  },
  async execute(args) {
    return documentsDomain.generateDocument({
      template: 'care_report',
      clientId: requireString(args, 'client_id'),
      month: optionalString(args, 'monat'),
    })
  },
}

// ── send_document ─────────────────────────────────────────────────────────

const sendDocument: JarvisTool = {
  name: 'send_document',
  requiresConfirmation: true,
  definition: {
    name: 'send_document',
    description:
      'Versendet ein bereits erzeugtes Dokument per E-Mail als PDF-Anhang. Ohne "to" wird die hinterlegte ' +
      'Portal-E-Mail des Kunden verwendet. Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: 'UUID des Dokuments (documents.id).' },
        to: { type: 'string', description: 'Empfänger-E-Mail (optional, Default: Kunden-E-Mail).' },
        subject: { type: 'string', description: 'Betreff (optional).' },
        message: { type: 'string', description: 'Nachrichtentext (optional).' },
      },
      required: ['document_id'],
    },
  },
  async execute(args) {
    return documentsDomain.sendDocument({
      documentId: requireString(args, 'document_id'),
      to: optionalString(args, 'to') ?? undefined,
      subject: optionalString(args, 'subject') ?? undefined,
      message: optionalString(args, 'message') ?? undefined,
    })
  },
}

// ── delete_document ───────────────────────────────────────────────────────

const deleteDocument: JarvisTool = {
  name: 'delete_document',
  requiresConfirmation: true,
  definition: {
    name: 'delete_document',
    description: 'Löscht ein Dokument unwiderruflich aus Datenbank und Storage. Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: 'UUID des Dokuments (documents.id).' },
      },
      required: ['document_id'],
    },
  },
  async execute(args) {
    await documentsDomain.deleteDocument(requireString(args, 'document_id'))
    return { deleted: true }
  },
}

export const documentTools: JarvisTool[] = [listDocuments, generateDocument, createCareReport, sendDocument, deleteDocument]
