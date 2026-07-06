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

async function figmaFetch(path: string): Promise<unknown> {
  const token = requireToken()
  const response = await fetch(`${API_BASE}${path}`, { headers: { 'X-Figma-Token': token } })

  if (response.status === 401 || response.status === 403) {
    throw new IntegrationError(SERVICE, 'unauthorized', 'FIGMA_ACCESS_TOKEN ist ungültig oder abgelaufen.')
  }
  if (!response.ok) {
    throw new IntegrationError(SERVICE, 'upstream_error', `Figma-API-Fehler (${response.status}).`)
  }
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
