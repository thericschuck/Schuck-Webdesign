import { tool } from 'ai'
import type { HelmToolDef, ToolExecuteContext } from './types'

/**
 * Baut aus einer Liste von HelmToolDef eine AI-SDK-Tool-Map, bei der jedes Tool DIREKT
 * ausführt (execute ruft def.execute unmittelbar auf). Nur für Tool-Listen verwenden, die
 * garantiert keine requiresConfirmation:true-Einträge enthalten (z.B. die auf einen
 * Sub-Agenten skalierte Registry aus lib/helm/delegate.ts — dort zur Laufzeit erzwungen).
 * Für den vollen Katalog (inkl. Bestätigungs-Vorschlägen) siehe
 * lib/helm/catalog/registry.ts#toAiSdkTools.
 */
export function buildAiSdkTools(defs: HelmToolDef[], context?: ToolExecuteContext) {
  return Object.fromEntries(
    defs.map((def) => [
      def.slug,
      tool({
        description: def.description,
        inputSchema: def.schema,
        execute: (args: Parameters<typeof def.execute>[0]) => def.execute(args, context),
      }),
    ])
  )
}
