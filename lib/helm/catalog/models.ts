/** Von der Cockpit-UI (PATCH /api/admin/helm/agents/[id]) und der Modell-Auswahl im
 * Node-Panel genutzte erlaubte Modell-Liste — ein Slot, statt wie zuvor eine 4. separate
 * hardcodierte Liste (cockpit/types.ts) parallel zu system-prompt.ts/agent.ts. */
export const ALLOWED_AGENT_MODELS = ['claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5'] as const

/** Modelle, für die `providerOptions.anthropic.thinking`/`effort` (Denktiefe-Picker im
 * Chat-Header, siehe lib/helm/core/run.ts) sicher gesetzt werden dürfen — bewusst
 * konservativ als Allowlist statt Regex-Heuristik: ein unsupportetes Modell lehnt den
 * Parameter mit einem 400 ab, statt ihn zu ignorieren. Liste erweitern, sobald weitere
 * Modelle aus ALLOWED_AGENT_MODELS bestätigt Extended Thinking unterstützen.
 */
export const THINKING_CAPABLE_MODELS: readonly string[] = ['claude-sonnet-5']

export function supportsThinking(model: string): boolean {
  return THINKING_CAPABLE_MODELS.includes(model)
}
