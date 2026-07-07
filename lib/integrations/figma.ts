import { IntegrationError } from './errors'
import { logIntegrationCall } from './log'

const SERVICE = 'figma'
const API_BASE = 'https://api.figma.com/v1'

export function isConfigured(): boolean {
  return Boolean(process.env.FIGMA_ACCESS_TOKEN?.trim())
}

function requireToken(): string {
  const token = process.env.FIGMA_ACCESS_TOKEN
  if (!token) throw new IntegrationError(SERVICE, 'missing_key', 'FIGMA_ACCESS_TOKEN ist nicht konfiguriert.')
  return token
}

async function figmaFetch(path: string, init?: { method?: string; body?: unknown }): Promise<unknown> {
  const token = requireToken()
  const response = await fetch(`${API_BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers: { 'X-Figma-Token': token, ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })

  if (response.status === 401 || response.status === 403) {
    throw new IntegrationError(
      SERVICE,
      'unauthorized',
      'FIGMA_ACCESS_TOKEN ist ungültig, abgelaufen oder hat nicht den nötigen Scope für diese Aktion.'
    )
  }
  if (!response.ok) {
    let detail = ''
    try {
      const body = (await response.json()) as { message?: string; err?: string }
      detail = body.message ?? body.err ?? ''
    } catch {
      // Antwort war kein JSON — ignorieren, generische Fehlermeldung reicht.
    }
    throw new IntegrationError(SERVICE, 'upstream_error', `Figma-API-Fehler (${response.status})${detail ? `: ${detail}` : '.'}`)
  }
  if (response.status === 204) return null
  return response.json()
}

interface FigmaNode {
  id: string
  name: string
  type: string
  children?: FigmaNode[]
}

interface FigmaFileResponse {
  name: string
  lastModified: string
  document: FigmaNode
}

export interface DesignContext {
  fileName: string
  lastModified: string
  pages: { id: string; name: string; frameCount: number }[]
  focusedNode?: { id: string; name: string; type: string; childCount: number }
}

/** Liefert einen kompakten Überblick über eine Figma-Datei (Seiten + Frame-Anzahl), optional fokussiert auf einen Node. */
export async function getDesignContext(fileKey: string, nodeId?: string): Promise<DesignContext> {
  try {
    const file = (await figmaFetch(`/files/${encodeURIComponent(fileKey)}`)) as FigmaFileResponse
    const pages = (file.document.children ?? []).map((page) => ({
      id: page.id,
      name: page.name,
      frameCount: page.children?.length ?? 0,
    }))

    let focusedNode: DesignContext['focusedNode']
    if (nodeId) {
      const nodesResult = (await figmaFetch(
        `/files/${encodeURIComponent(fileKey)}/nodes?ids=${encodeURIComponent(nodeId)}`
      )) as { nodes: Record<string, { document: FigmaNode }> }
      const node = nodesResult.nodes[nodeId]?.document
      if (node) {
        focusedNode = { id: node.id, name: node.name, type: node.type, childCount: node.children?.length ?? 0 }
      }
    }

    const result: DesignContext = { fileName: file.name, lastModified: file.lastModified, pages, focusedNode }
    await logIntegrationCall(SERVICE, true)
    return result
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}

/** Liefert eine (zeitlich begrenzt gültige) Bild-URL für einen Node — Eric/JARVIS können sie zum Betrachten öffnen. */
export async function getScreenshot(fileKey: string, nodeId: string, format: 'png' | 'svg' = 'png'): Promise<string> {
  try {
    const result = (await figmaFetch(
      `/images/${encodeURIComponent(fileKey)}?ids=${encodeURIComponent(nodeId)}&format=${format}`
    )) as { images: Record<string, string | null>; err?: string }

    if (result.err) throw new IntegrationError(SERVICE, 'upstream_error', `Figma-Export-Fehler: ${result.err}`)
    const url = result.images[nodeId]
    if (!url) throw new IntegrationError(SERVICE, 'upstream_error', `Kein Export für Node "${nodeId}" verfügbar.`)

    await logIntegrationCall(SERVICE, true)
    return url
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}

// ── Schreibzugriff ────────────────────────────────────────────────────────
// Figmas REST-API kann NICHT das Design-Canvas selbst bearbeiten (Frames verschieben,
// Farben ändern, Layer hinzufügen) — das geht nur über die Figma Plugin-API, die als Plugin
// INNERHALB der Figma-App läuft, nicht von einem Server aus aufrufbar ist. Was die REST-API
// tatsächlich schreiben kann: Kommentare, Dev-Resources (Links im Dev-Mode) und — nur auf
// Figma-Enterprise-Plänen — Variablen. Alle drei Bereiche unten.

export interface PostedComment {
  id: string
  message: string
  createdAt: string
}

/** Postet einen Kommentar auf einer Figma-Datei — an einen Node gepinnt, falls nodeId angegeben, sonst am Seitenursprung. */
export async function postComment(fileKey: string, message: string, options?: { nodeId?: string; replyToCommentId?: string }): Promise<PostedComment> {
  try {
    const body: Record<string, unknown> = { message }
    if (options?.replyToCommentId) {
      body.comment_id = options.replyToCommentId
    } else if (options?.nodeId) {
      body.client_meta = { node_id: options.nodeId, node_offset: { x: 0, y: 0 } }
    } else {
      body.client_meta = { x: 0, y: 0 }
    }

    const result = (await figmaFetch(`/files/${encodeURIComponent(fileKey)}/comments`, { method: 'POST', body })) as {
      id: string
      message: string
      created_at: string
    }
    const posted: PostedComment = { id: result.id, message: result.message, createdAt: result.created_at }
    await logIntegrationCall(SERVICE, true)
    return posted
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}

export async function deleteComment(fileKey: string, commentId: string): Promise<void> {
  try {
    await figmaFetch(`/files/${encodeURIComponent(fileKey)}/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' })
    await logIntegrationCall(SERVICE, true)
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}

export interface DevResourceResult {
  createdCount: number
  errors: string[]
}

/** Hängt einen Link (z.B. Jira-Ticket, Doku) im Dev-Mode an einen Node an. */
export async function createDevResource(fileKey: string, nodeId: string, name: string, url: string): Promise<DevResourceResult> {
  try {
    const result = (await figmaFetch(`/files/${encodeURIComponent(fileKey)}/dev_resources`, {
      method: 'POST',
      body: { dev_resources: [{ name, url, file_key: fileKey, node_id: nodeId }] },
    })) as { links_created?: unknown[]; errors?: { error: string }[] }

    const errors = (result.errors ?? []).map((e) => e.error)
    await logIntegrationCall(SERVICE, errors.length === 0)
    return { createdCount: result.links_created?.length ?? 0, errors }
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}

export async function deleteDevResource(fileKey: string, devResourceId: string): Promise<void> {
  try {
    await figmaFetch(`/files/${encodeURIComponent(fileKey)}/dev_resources/${encodeURIComponent(devResourceId)}`, { method: 'DELETE' })
    await logIntegrationCall(SERVICE, true)
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}

export interface VariableSummary {
  id: string
  name: string
  resolvedType: string
  collectionId: string
  valuesByMode: Record<string, unknown>
}

/**
 * Liest lokale Variablen (Farben/Spacing/etc.) einer Datei. Nur auf Figma-Enterprise-Plänen
 * verfügbar — auf anderen Plänen liefert Figma hier einen Fehler, der als upstream_error durchgereicht wird.
 */
export async function getVariables(fileKey: string): Promise<VariableSummary[]> {
  try {
    const result = (await figmaFetch(`/files/${encodeURIComponent(fileKey)}/variables/local`)) as {
      meta: { variables: Record<string, { id: string; name: string; resolvedType: string; variableCollectionId: string; valuesByMode: Record<string, unknown> }> }
    }
    const variables = Object.values(result.meta.variables).map((v) => ({
      id: v.id,
      name: v.name,
      resolvedType: v.resolvedType,
      collectionId: v.variableCollectionId,
      valuesByMode: v.valuesByMode,
    }))
    await logIntegrationCall(SERVICE, true)
    return variables
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}

/**
 * Setzt den Wert einer Variable für einen bestimmten Mode (z.B. "Light"/"Dark"). Nur auf
 * Figma-Enterprise-Plänen verfügbar. `value` hängt vom Variablentyp ab — bei COLOR z.B.
 * `{ r, g, b, a }` mit Werten 0-1, bei FLOAT eine Zahl, bei STRING/BOOLEAN der jeweilige Wert direkt.
 */
export async function updateVariableValue(fileKey: string, variableId: string, modeId: string, value: unknown): Promise<void> {
  try {
    await figmaFetch(`/files/${encodeURIComponent(fileKey)}/variables`, {
      method: 'POST',
      body: { variableModeValues: [{ variableId, modeId, value }] },
    })
    await logIntegrationCall(SERVICE, true)
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}
