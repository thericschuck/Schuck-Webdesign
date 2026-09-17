import type { z } from 'zod'

// ── Tool-Katalog-Interface ──────────────────────────────────────────────────
// Jedes HELM-Tool wird als HelmToolDef definiert und über lib/helm/catalog/registry.ts
// in einen einzigen Katalog zusammengeführt. Das zod-Schema ist gleichzeitig die
// Laufzeit-Validierung (AI SDK validiert args gegen `schema`, bevor `execute` läuft)
// UND die Quelle für die im System-Prompt gerenderte Tool-Beschreibung — anders als
// JARVIS, wo Schema (Anthropic.Tool), Prompt-Prosa-Liste und Cockpit-DB-Kopie getrennt
// von Hand synchron gehalten werden mussten.

export interface ToolExecuteContext {
  /** run_id des aktuellen agent_runs-Eintrags (lib/helm/core/run.ts) — wird an
   * buildDelegateTool() (lib/helm/delegate.ts) durchgereicht, damit Sub-Agenten-Aufrufe
   * dort als parent_run_id verlinkt werden. */
  runId?: string
}

export interface HelmToolDef<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  /** Tool-Name/-Slug, wie ihn das Modell aufruft und wie er in agent_tools/tools referenziert wird. */
  slug: string
  /** Kurzes, menschenlesbares Label — für Cockpit-UI und (bei requiresConfirmation) als
   * Default-Präfix der Bestätigungs-Zusammenfassung. */
  label: string
  /** Tool-Beschreibung für das Modell (system prompt Tool-Katalog) UND für die Cockpit-UI. */
  description: string
  schema: TSchema
  /**
   * true = das Tool führt nichts direkt aus. lib/helm/actions/pending-actions.ts baut daraus
   * automatisch ein "Vorschlag"-Tool, das nur einen pending_actions-Eintrag anlegt und
   * {status:'pending_confirmation', actionId, summary} zurückgibt — execute() (unten) wird
   * dabei NICHT vom Modell-Loop aufgerufen, sondern erst später von
   * lib/helm/actions/confirm.ts#confirmPendingAction() nach Erics Bestätigung.
   */
  requiresConfirmation: boolean
  /** Nur für requiresConfirmation:true-Tools: menschenlesbare Zusammenfassung der konkreten
   * Aktion für den Bestätigungsdialog. Ohne diese Funktion wird `label` + JSON der Argumente
   * als Fallback-Zusammenfassung verwendet. */
  summarize?: (args: z.infer<TSchema>) => string
  /** Der eigentliche Effekt. Bei requiresConfirmation:false wird das direkt vom Modell-Loop
   * aufgerufen; bei requiresConfirmation:true erst bei der Bestätigung. */
  execute: (args: z.infer<TSchema>, context?: ToolExecuteContext) => Promise<unknown>
}

/** Typ-Helfer nur für Inferenz — erzwingt, dass `execute`/`summarize` gegen das `schema`
 * derselben Definition typgeprüft werden, ohne dass jede Datei den Typparameter explizit
 * ausschreiben muss. */
export function defineTool<TSchema extends z.ZodTypeAny>(def: HelmToolDef<TSchema>): HelmToolDef<TSchema> {
  return def
}
