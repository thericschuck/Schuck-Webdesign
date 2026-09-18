export type HelmEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export const DEFAULT_HELM_MODEL = 'claude-sonnet-5'
export const DEFAULT_HELM_EFFORT: HelmEffort = 'medium'

/** Denktiefe → Extended-Thinking-Budget (Tokens). Fünf Stufen wie im Chat-Header-Regler,
 * gemappt auf Anthropics `thinking.budgetTokens` (siehe lib/helm/core/run.ts) — die
 * dokumentierte, stabile Form von Extended Thinking, statt einer noch unklaren
 * "adaptive/effort"-Variante. */
export const HELM_EFFORT_OPTIONS: { value: HelmEffort; label: string; budgetTokens: number }[] = [
  { value: 'low', label: 'Niedrig — schnell & günstig', budgetTokens: 1024 },
  { value: 'medium', label: 'Mittel — Standard', budgetTokens: 4096 },
  { value: 'high', label: 'Hoch', budgetTokens: 10_000 },
  { value: 'xhigh', label: 'Sehr hoch', budgetTokens: 20_000 },
  { value: 'max', label: 'Maximal — gründlich & teuer', budgetTokens: 32_000 },
]

export function effortBudgetTokens(effort: HelmEffort): number {
  return HELM_EFFORT_OPTIONS.find((o) => o.value === effort)?.budgetTokens ?? HELM_EFFORT_OPTIONS[1].budgetTokens
}
