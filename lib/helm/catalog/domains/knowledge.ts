import { z } from 'zod'
import { defineTool, type HelmToolDef } from '../types'
import * as knowledgeDomain from '@/lib/domain/knowledge'
import type { EdgeType, NodeConfidence, NodeType } from '@/types/database'

const NODE_TYPE_VALUES = knowledgeDomain.NODE_TYPES
const EDGE_TYPE_VALUES = knowledgeDomain.EDGE_TYPES
const CONFIDENCE_VALUES = knowledgeDomain.NODE_CONFIDENCE_VALUES

const nodeTypeSchema = z.enum(NODE_TYPE_VALUES as unknown as [string, ...string[]])
const edgeTypeSchema = z.enum(EDGE_TYPE_VALUES as unknown as [string, ...string[]])
const confidenceSchema = z.enum(CONFIDENCE_VALUES as unknown as [string, ...string[]])

// ── get_client_context ───────────────────────────────────────────────────

const getClientContext = defineTool({
  slug: 'get_client_context',
  label: 'Kunden-Kontext abrufen',
  description:
    'Liefert einen komprimierten Kontext-Block aus dem Wissensgraph für einen bestimmten Kunden ' +
    '(alle verknüpften Knoten bis Traversal-Tiefe 3, deprecated ausgeschlossen). Nutze das, wenn du gezielt ' +
    'tiefer zu einem bekannten Kunden recherchieren willst — der automatische Kontext im System-Prompt ' +
    'basiert nur auf dem letzten Prompt, nicht auf einer expliziten Kunden-ID.',
  requiresConfirmation: false,
  schema: z.object({
    client_id: z.string().describe('UUID des Kunden (clients.id).'),
  }),
  async execute(args) {
    return knowledgeDomain.getClientContext({ clientId: args.client_id })
  },
})

// ── semantic_search ───────────────────────────────────────────────────────

const semanticSearch = defineTool({
  slug: 'semantic_search',
  label: 'Semantische Suche',
  description: 'Durchsucht den Wissensgraph semantisch — findet relevante Knoten anhand eines natürlichsprachigen Suchbegriffs.',
  requiresConfirmation: false,
  schema: z.object({
    query: z.string().min(1).describe('Freitext-Suchanfrage.'),
    k: z.number().optional().describe('Anzahl Treffer, Default 20.'),
  }),
  async execute(args) {
    return knowledgeDomain.semanticSearch(args.query, args.k)
  },
})

// ── add_knowledge_node ────────────────────────────────────────────────────

const addKnowledgeNode = defineTool({
  slug: 'add_knowledge_node',
  label: 'Wissensknoten anlegen',
  description:
    'Legt einen neuen Wissens-Knoten an (fact, preference, note, process, contact, product). ' +
    'client-/project-Knoten entstehen automatisch bei create_client/create_project — nicht selbst anlegen. ' +
    'Erstellt automatisch ein Embedding für Semantic Search.',
  requiresConfirmation: false,
  schema: z.object({
    type: nodeTypeSchema.describe('Knotentyp.'),
    label: z.string().min(1).describe('Kurzer, sprechender Titel.'),
    body: z.string().optional().describe('Ausführlicher Text (optional).'),
    ref_id: z.string().optional().describe('UUID einer verknüpften Entität, z.B. clients.id (optional).'),
    ref_table: z.string().optional().describe("Tabelle der ref_id, z.B. 'clients' (optional)."),
  }),
  async execute(args) {
    return knowledgeDomain.addNode({
      type: args.type as NodeType,
      label: args.label,
      body: args.body ?? null,
      refId: args.ref_id ?? null,
      refTable: args.ref_table ?? null,
      source: 'jarvis_auto',
    })
  },
})

// ── update_knowledge_node ─────────────────────────────────────────────────

const updateKnowledgeNode = defineTool({
  slug: 'update_knowledge_node',
  label: 'Wissensknoten aktualisieren',
  description:
    'Aktualisiert label/body eines bestehenden Knotens (Embedding wird automatisch neu erzeugt) und/oder ' +
    'seine confidence. Für Widersprüche: alten Knoten per confidence "low" markieren, nicht löschen.',
  requiresConfirmation: false,
  schema: z.object({
    node_id: z.string().describe('UUID des Knotens (nodes.id).'),
    label: z.string().optional().describe('Neues Label (optional).'),
    body: z.string().optional().describe('Neuer Text (optional).'),
    confidence: confidenceSchema.optional().describe('Neue confidence (optional).'),
  }),
  async execute(args) {
    return knowledgeDomain.updateNode(args.node_id, {
      label: args.label ?? undefined,
      body: args.body ?? null,
      confidence: (args.confidence as NodeConfidence | undefined) ?? undefined,
    })
  },
})

// ── deprecate_knowledge_node ──────────────────────────────────────────────

const deprecateKnowledgeNode = defineTool({
  slug: 'deprecate_knowledge_node',
  label: 'Wissensknoten als veraltet markieren',
  description:
    'Markiert einen veralteten Knoten als "deprecated" — kein Hard-Delete, die Historie bleibt erhalten, ' +
    'der Knoten fließt aber nicht mehr in Semantic Search oder den automatischen Kontext ein.',
  requiresConfirmation: false,
  schema: z.object({
    node_id: z.string().describe('UUID des Knotens (nodes.id).'),
  }),
  async execute(args) {
    await knowledgeDomain.deprecateNode(args.node_id)
    return { deprecated: true }
  },
})

// ── link_knowledge_nodes ──────────────────────────────────────────────────

const linkKnowledgeNodes = defineTool({
  slug: 'link_knowledge_nodes',
  label: 'Wissensknoten verlinken',
  description:
    'Erstellt eine Kante zwischen zwei bestehenden Knoten. Erneutes Verlinken desselben Paars mit demselben ' +
    'Typ erhöht das weight, statt eine zweite Kante anzulegen (Bestätigung).',
  requiresConfirmation: false,
  schema: z.object({
    from_id: z.string().describe('UUID des Ausgangsknotens.'),
    to_id: z.string().describe('UUID des Zielknotens.'),
    type: edgeTypeSchema.describe('Kantentyp.'),
  }),
  async execute(args) {
    return knowledgeDomain.linkNodes(args.from_id, args.to_id, args.type as EdgeType)
  },
})

// ── list_session_logs ─────────────────────────────────────────────────────

const listSessionLogs = defineTool({
  slug: 'list_session_logs',
  label: 'Sitzungsprotokolle auflisten',
  description: 'Listet Gesprächsprotokolle chronologisch (neueste zuerst), optional gefiltert nach Knoten oder Zeitraum.',
  requiresConfirmation: false,
  schema: z.object({
    node_id: z.string().optional().describe('UUID eines Session-Knotens (optional).'),
    from_date: z.string().optional().describe('Format YYYY-MM-DD (optional).'),
    to_date: z.string().optional().describe('Format YYYY-MM-DD (optional).'),
  }),
  async execute(args) {
    return knowledgeDomain.listSessionLogs({
      nodeId: args.node_id,
      fromDate: args.from_date,
      toDate: args.to_date,
    })
  },
})

// ── write_session_log ─────────────────────────────────────────────────────

const writeSessionLog = defineTool({
  slug: 'write_session_log',
  label: 'Sitzungsprotokoll schreiben',
  description:
    'Speichert eine selbst verfasste Zusammenfassung des aktuellen Gesprächs als Session-Knoten + ' +
    'Gesprächsprotokoll und verlinkt sie zu den genannten Kunden/Projekten. Rufe das am Ende jedes ' +
    'inhaltlich relevanten Gesprächs auf — das ist der einzige Weg, wie ein Gespräch im Wissensgraph landet.',
  requiresConfirmation: false,
  schema: z.object({
    title: z
      .string()
      .min(1)
      .describe(
        'Kurzer, inhaltlicher Titel wie eine E-Mail-Betreffzeile (3–8 Wörter, z.B. "Rechnung für ' +
          'Bobby Stöcker klären" oder "Domainumzug Spirit of Soul besprochen") — KEIN generisches ' +
          '"Gespräch" + Datum, das Datum wird separat angezeigt. Muss das eigentliche Thema erkennen ' +
          'lassen, damit mehrere Sessions am selben Tag in der Liste unterscheidbar sind.'
      ),
    summary: z.string().min(1).describe('Kurze Zusammenfassung des Gesprächs.'),
    client_ids: z.array(z.string()).optional().describe('UUIDs betroffener Kunden (optional).'),
    project_ids: z.array(z.string()).optional().describe('UUIDs betroffener Projekte (optional).'),
  }),
  async execute(args) {
    return knowledgeDomain.writeSessionLog({
      title: args.title,
      summary: args.summary,
      clientIds: args.client_ids,
      projectIds: args.project_ids,
    })
  },
})

export const knowledgeTools: HelmToolDef[] = [
  getClientContext,
  semanticSearch,
  addKnowledgeNode,
  updateKnowledgeNode,
  deprecateKnowledgeNode,
  linkKnowledgeNodes,
  listSessionLogs,
  writeSessionLog,
]
