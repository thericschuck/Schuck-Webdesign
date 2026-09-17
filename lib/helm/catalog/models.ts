/** Von der Cockpit-UI (PATCH /api/admin/helm/agents/[id]) und der Modell-Auswahl im
 * Node-Panel genutzte erlaubte Modell-Liste — ein Slot, statt wie zuvor eine 4. separate
 * hardcodierte Liste (cockpit/types.ts) parallel zu system-prompt.ts/agent.ts. */
export const ALLOWED_AGENT_MODELS = ['claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5'] as const
