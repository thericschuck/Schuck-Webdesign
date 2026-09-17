import type { HelmToolDef } from './types'
import { clientTools } from './domains/clients'
import { projectTools } from './domains/projects'
import { productTools } from './domains/products'
import { akquiseTools } from './domains/akquise'
import { financeTools } from './domains/finance'
import { documentTools } from './domains/documents'
import { knowledgeTools } from './domains/knowledge'
import { integrationTools } from './domains/integrations'
import { todoTools } from './domains/todos'
import { notificationTools } from './domains/notifications'

/**
 * Alle "echten" (domänen-)Tools, OHNE die Sub-Agenten-Delegations-Tools aus
 * lib/helm/delegate.ts. Eigene Datei statt Teil von registry.ts, damit delegate.ts
 * (buildScopedRegistry — jeder Sub-Agent bekommt eine Teilmenge dieser Liste) diese Liste
 * importieren kann, OHNE registry.ts zu importieren, das seinerseits die Delegations-Tools
 * aus delegate.ts einbindet — vermeidet den Zirkelbezug, den JARVIS früher über eine
 * lokal duplizierte Tool-Liste in tools/subagents.ts umgehen musste (siehe
 * lib/jarvis/tools/subagents.ts, ALL_TOOLS-Kommentar).
 */
export const BASE_TOOLS: HelmToolDef[] = [
  ...clientTools,
  ...projectTools,
  ...productTools,
  ...akquiseTools,
  ...financeTools,
  ...documentTools,
  ...knowledgeTools,
  ...integrationTools,
  ...todoTools,
  ...notificationTools,
]

export const BASE_TOOLS_BY_SLUG = new Map(BASE_TOOLS.map((tool) => [tool.slug, tool]))
