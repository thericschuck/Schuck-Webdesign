import { BASE_TOOLS } from './base-tools'
import { buildDelegateTools } from '../delegate'
import { buildProposalTool } from '../actions/pending-actions'
import { buildAiSdkTools } from './build'
import type { HelmToolDef, ToolExecuteContext } from './types'

/**
 * Vollständiger Tool-Katalog: Domänen-Tools (base-tools.ts) + die 6 Sub-Agenten-
 * Delegations-Tools (delegate.ts) als ganz normale weitere Katalog-Einträge. Single Source
 * of Truth für: Modell-Tool-Definitionen (toAiSdkTools), Cockpit-UI-Metadaten (CATALOG
 * selbst) und die Ausführung bei Bestätigung (CATALOG_BY_SLUG, siehe
 * lib/helm/actions/confirm.ts) — anders als JARVIS, wo dieselbe Information über Code,
 * public.tools und mehrere Prompt-Prosa-Listen verstreut war.
 */
export const CATALOG: HelmToolDef[] = [...BASE_TOOLS, ...buildDelegateTools()]

export const CATALOG_BY_SLUG = new Map(CATALOG.map((def) => [def.slug, def]))

/** Slugs aller Tools, die einen Bestätigungsvorschlag statt sofortiger Ausführung auslösen
 * — ersetzt JARVISs hart im System-Prompt gepflegte "Human-in-the-Loop"-Liste. */
export const CONFIRMATION_REQUIRED_SLUGS: string[] = CATALOG.filter((def) => def.requiresConfirmation).map(
  (def) => def.slug
)

/**
 * Baut die AI-SDK-Tool-Map für einen streamText()-Aufruf des Haupt-Orchestrators.
 * requiresConfirmation:true-Tools werden NIE direkt ausführbar gemacht — sie laufen immer
 * über buildProposalTool() (lib/helm/actions/pending-actions.ts).
 */
export function toAiSdkTools(context?: ToolExecuteContext) {
  const confirmable = CATALOG.filter((def) => def.requiresConfirmation)
  const direct = CATALOG.filter((def) => !def.requiresConfirmation)

  return {
    ...buildAiSdkTools(direct, context),
    ...Object.fromEntries(confirmable.map((def) => [def.slug, buildProposalTool(def, context)])),
  }
}
