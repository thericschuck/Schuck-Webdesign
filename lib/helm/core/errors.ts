/**
 * Wird geworfen, wenn ein Sub-Agent aufgerufen wird, dessen agents.status auf 'inactive'
 * steht (z.B. über den Bearbeiten-Toggle im Cockpit deaktiviert, siehe
 * app/(admin)/admin/helm/cockpit/CockpitNodePanel.tsx). Analog zu
 * IntegrationError('missing_key') in lib/integrations/errors.ts: kein transienter Fehler,
 * den ein erneuter Versuch beheben könnte — lib/helm/core/run.ts eskaliert deshalb sofort
 * statt die Reflection-Loop-Retries zu verbrauchen.
 */
export class AgentDisabledError extends Error {
  constructor(agentSlug: string) {
    super(`Sub-Agent "${agentSlug}" ist aktuell deaktiviert (agents.status = 'inactive').`)
    this.name = 'AgentDisabledError'
  }
}
