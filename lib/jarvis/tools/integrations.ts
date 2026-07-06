import type { JarvisTool } from '../tool-types'
import { optionalString, requireString } from './helpers'
import * as figma from '@/lib/integrations/figma'

// ── figma_get_design_context ────────────────────────────────────────────────

const figmaGetDesignContext: JarvisTool = {
  name: 'figma_get_design_context',
  requiresConfirmation: false,
  definition: {
    name: 'figma_get_design_context',
    description:
      'Liest den Design-Kontext einer Figma-Datei: Seiten, Frame-Anzahl, optional Details zu einem konkreten Node. ' +
      'Nur verfügbar, wenn FIGMA_ACCESS_TOKEN konfiguriert ist.',
    input_schema: {
      type: 'object',
      properties: {
        file_key: { type: 'string', description: 'Figma-Datei-Key (aus der Figma-URL, z.B. .../file/ABCdef123/...).' },
        node_id: { type: 'string', description: 'Optionale Node-ID für Details zu einem konkreten Frame/Element.' },
      },
      required: ['file_key'],
    },
  },
  async execute(args) {
    return figma.getDesignContext(requireString(args, 'file_key'), optionalString(args, 'node_id') ?? undefined)
  },
}

// ── figma_get_screenshot ─────────────────────────────────────────────────────

const figmaGetScreenshot: JarvisTool = {
  name: 'figma_get_screenshot',
  requiresConfirmation: false,
  definition: {
    name: 'figma_get_screenshot',
    description:
      'Exportiert einen Figma-Node als Bild und liefert eine (zeitlich begrenzt gültige) URL zum Öffnen. ' +
      'Nur verfügbar, wenn FIGMA_ACCESS_TOKEN konfiguriert ist.',
    input_schema: {
      type: 'object',
      properties: {
        file_key: { type: 'string', description: 'Figma-Datei-Key.' },
        node_id: { type: 'string', description: 'Node-ID des zu exportierenden Frames/Elements.' },
        format: { type: 'string', enum: ['png', 'svg'], description: 'Export-Format, Default png.' },
      },
      required: ['file_key', 'node_id'],
    },
  },
  async execute(args) {
    const format = optionalString(args, 'format')
    return figma.getScreenshot(
      requireString(args, 'file_key'),
      requireString(args, 'node_id'),
      format === 'svg' ? 'svg' : 'png'
    )
  },
}

export const integrationTools: JarvisTool[] = [figmaGetDesignContext, figmaGetScreenshot]
