import type { JarvisTool } from '../tool-types'
import { optionalString, requireString } from './helpers'
import * as knowledgeDomain from '@/lib/domain/knowledge'
import type { EdgeType, NodeConfidence, NodeType } from '@/types/database'

const NODE_TYPE_VALUES = knowledgeDomain.NODE_TYPES
const EDGE_TYPE_VALUES = knowledgeDomain.EDGE_TYPES
const CONFIDENCE_VALUES = knowledgeDomain.NODE_CONFIDENCE_VALUES

function optionalStringArray(args: Record<string, unknown>, key: string): string[] | undefined {
  const value = args[key]
  if (!Array.isArray(value)) return undefined
  return value.filter((v): v is string => typeof v === 'string')
}

// ── get_client_context ───────────────────────────────────────────────────

const getClientContext: JarvisTool = {
  name: 'get_client_context',
  requiresConfirmation: false,
  definition: {
    name: 'get_client_context',
    description:
      'Liefert einen komprimierten Kontext-Block aus dem Wissensgraph für einen bestimmten Kunden ' +
      '(alle verknüpften Knoten bis Traversal-Tiefe 3, deprecated ausgeschlossen). Nutze das, wenn du gezielt ' +
      'tiefer zu einem bekannten Kunden recherchieren willst — der automatische Kontext im System-Prompt ' +
      'basiert nur auf dem letzten Prompt, nicht auf einer expliziten Kunden-ID.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'UUID des Kunden (clients.id).' },
      },
      required: ['client_id'],
    },
  },
  async execute(args) {
    return knowledgeDomain.getClientContext({ clientId: requireString(args, 'client_id') })
  },
}

// ── semantic_search ───────────────────────────────────────────────────────

const semanticSearch: JarvisTool = {
  name: 'semantic_search',
  requiresConfirmation: false,
  definition: {
    name: 'semantic_search',
    description: 'Durchsucht den Wissensgraph semantisch — findet relevante Knoten anhand eines natürlichsprachigen Suchbegriffs.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Freitext-Suchanfrage.' },
        k: { type: 'number', description: 'Anzahl Treffer, Default 20.' },
      },
      required: ['query'],
    },
  },
  async execute(args) {
    const k = args.k
    return knowledgeDomain.semanticSearch(requireString(args, 'query'), typeof k === 'number' ? k : undefined)
  },
}

// ── add_knowledge_node ────────────────────────────────────────────────────

const addKnowledgeNode: JarvisTool = {
  name: 'add_knowledge_node',
  requiresConfirmation: false,
  definition: {
    name: 'add_knowledge_node',
    description:
      'Legt einen neuen Wissens-Knoten an (fact, preference, note, process, contact, product). ' +
      'client-/project-Knoten entstehen automatisch bei create_client/create_project — nicht selbst anlegen. ' +
      'Erstellt automatisch ein Embedding für Semantic Search.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: [...NODE_TYPE_VALUES], description: 'Knotentyp.' },
        label: { type: 'string', description: 'Kurzer, sprechender Titel.' },
        body: { type: 'string', description: 'Ausführlicher Text (optional).' },
        ref_id: { type: 'string', description: 'UUID einer verknüpften Entität, z.B. clients.id (optional).' },
        ref_table: { type: 'string', description: "Tabelle der ref_id, z.B. 'clients' (optional)." },
      },
      required: ['type', 'label'],
    },
  },
  async execute(args) {
    const type = requireString(args, 'type') as NodeType
    if (!NODE_TYPE_VALUES.includes(type)) {
      throw new Error(`Ungültiger Typ "${type}". Erlaubt: ${NODE_TYPE_VALUES.join(', ')}.`)
    }
    return knowledgeDomain.addNode({
      type,
      label: requireString(args, 'label'),
      body: optionalString(args, 'body'),
      refId: optionalString(args, 'ref_id'),
      refTable: optionalString(args, 'ref_table'),
      source: 'jarvis_auto',
    })
  },
}

// ── update_knowledge_node ─────────────────────────────────────────────────

const updateKnowledgeNode: JarvisTool = {
  name: 'update_knowledge_node',
  requiresConfirmation: false,
  definition: {
    name: 'update_knowledge_node',
    description:
      'Aktualisiert label/body eines bestehenden Knotens (Embedding wird automatisch neu erzeugt) und/oder ' +
      'seine confidence. Für Widersprüche: alten Knoten per confidence "low" markieren, nicht löschen.',
    input_schema: {
      type: 'object',
      properties: {
        node_id: { type: 'string', description: 'UUID des Knotens (nodes.id).' },
        label: { type: 'string', description: 'Neues Label (optional).' },
        body: { type: 'string', description: 'Neuer Text (optional).' },
        confidence: { type: 'string', enum: [...CONFIDENCE_VALUES], description: 'Neue confidence (optional).' },
      },
      required: ['node_id'],
    },
  },
  async execute(args) {
    return knowledgeDomain.updateNode(requireString(args, 'node_id'), {
      label: optionalString(args, 'label') ?? undefined,
      body: optionalString(args, 'body'),
      confidence: (optionalString(args, 'confidence') as NodeConfidence | null) ?? undefined,
    })
  },
}

// ── deprecate_knowledge_node ──────────────────────────────────────────────

const deprecateKnowledgeNode: JarvisTool = {
  name: 'deprecate_knowledge_node',
  requiresConfirmation: false,
  definition: {
    name: 'deprecate_knowledge_node',
    description:
      'Markiert einen veralteten Knoten als "deprecated" — kein Hard-Delete, die Historie bleibt erhalten, ' +
      'der Knoten fließt aber nicht mehr in Semantic Search oder den automatischen Kontext ein.',
    input_schema: {
      type: 'object',
      properties: {
        node_id: { type: 'string', description: 'UUID des Knotens (nodes.id).' },
      },
      required: ['node_id'],
    },
  },
  async execute(args) {
    await knowledgeDomain.deprecateNode(requireString(args, 'node_id'))
    return { deprecated: true }
  },
}

// ── link_knowledge_nodes ──────────────────────────────────────────────────

const linkKnowledgeNodes: JarvisTool = {
  name: 'link_knowledge_nodes',
  requiresConfirmation: false,
  definition: {
    name: 'link_knowledge_nodes',
    description:
      'Erstellt eine Kante zwischen zwei bestehenden Knoten. Erneutes Verlinken desselben Paars mit demselben ' +
      'Typ erhöht das weight, statt eine zweite Kante anzulegen (Bestätigung).',
    input_schema: {
      type: 'object',
      properties: {
        from_id: { type: 'string', description: 'UUID des Ausgangsknotens.' },
        to_id: { type: 'string', description: 'UUID des Zielknotens.' },
        type: { type: 'string', enum: [...EDGE_TYPE_VALUES], description: 'Kantentyp.' },
      },
      required: ['from_id', 'to_id', 'type'],
    },
  },
  async execute(args) {
    const type = requireString(args, 'type') as EdgeType
    if (!EDGE_TYPE_VALUES.includes(type)) {
      throw new Error(`Ungültiger Kantentyp "${type}". Erlaubt: ${EDGE_TYPE_VALUES.join(', ')}.`)
    }
    return knowledgeDomain.linkNodes(requireString(args, 'from_id'), requireString(args, 'to_id'), type)
  },
}

// ── list_session_logs ─────────────────────────────────────────────────────

const listSessionLogs: JarvisTool = {
  name: 'list_session_logs',
  requiresConfirmation: false,
  definition: {
    name: 'list_session_logs',
    description: 'Listet Gesprächsprotokolle chronologisch (neueste zuerst), optional gefiltert nach Knoten oder Zeitraum.',
    input_schema: {
      type: 'object',
      properties: {
        node_id: { type: 'string', description: 'UUID eines Session-Knotens (optional).' },
        from_date: { type: 'string', description: 'Format YYYY-MM-DD (optional).' },
        to_date: { type: 'string', description: 'Format YYYY-MM-DD (optional).' },
      },
    },
  },
  async execute(args) {
    return knowledgeDomain.listSessionLogs({
      nodeId: optionalString(args, 'node_id') ?? undefined,
      fromDate: optionalString(args, 'from_date') ?? undefined,
      toDate: optionalString(args, 'to_date') ?? undefined,
    })
  },
}

// ── write_session_log ─────────────────────────────────────────────────────

const writeSessionLog: JarvisTool = {
  name: 'write_session_log',
  requiresConfirmation: false,
  definition: {
    name: 'write_session_log',
    description:
      'Speichert eine selbst verfasste Zusammenfassung des aktuellen Gesprächs als Session-Knoten + ' +
      'Gesprächsprotokoll und verlinkt sie zu den genannten Kunden/Projekten. Rufe das am Ende jedes ' +
      'inhaltlich relevanten Gesprächs auf — das ist der einzige Weg, wie ein Gespräch im Wissensgraph landet.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description:
            'Kurzer, inhaltlicher Titel wie eine E-Mail-Betreffzeile (3–8 Wörter, z.B. "Rechnung für ' +
            'Bobby Stöcker klären" oder "Domainumzug Spirit of Soul besprochen") — KEIN generisches ' +
            '"Gespräch" + Datum, das Datum wird separat angezeigt. Muss das eigentliche Thema erkennen ' +
            'lassen, damit mehrere Sessions am selben Tag in der Liste unterscheidbar sind.',
        },
        summary: { type: 'string', description: 'Kurze Zusammenfassung des Gesprächs.' },
        client_ids: { type: 'array', items: { type: 'string' }, description: 'UUIDs betroffener Kunden (optional).' },
        project_ids: { type: 'array', items: { type: 'string' }, description: 'UUIDs betroffener Projekte (optional).' },
      },
      required: ['title', 'summary'],
    },
  },
  async execute(args) {
    return knowledgeDomain.writeSessionLog({
      title: requireString(args, 'title'),
      summary: requireString(args, 'summary'),
      clientIds: optionalStringArray(args, 'client_ids'),
      projectIds: optionalStringArray(args, 'project_ids'),
    })
  },
}

export const knowledgeTools: JarvisTool[] = [
  getClientContext,
  semanticSearch,
  addKnowledgeNode,
  updateKnowledgeNode,
  deprecateKnowledgeNode,
  linkKnowledgeNodes,
  listSessionLogs,
  writeSessionLog,
]
