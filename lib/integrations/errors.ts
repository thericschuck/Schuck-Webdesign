/**
 * Fehler aus der Integrations-Schicht (lib/integrations/*). `code` steuert,
 * wie lib/helm/core/run.ts mit dem Fehler umgeht: "missing_key"/"unauthorized"
 * eskalieren sofort (ein Retry ändert nichts an einem fehlenden/ungültigen
 * Schlüssel), "upstream_error" durchläuft die normale Retry-Zählung.
 */
export class IntegrationError extends Error {
  constructor(
    public service: string,
    public code: 'missing_key' | 'unauthorized' | 'upstream_error',
    message: string
  ) {
    super(message)
    this.name = 'IntegrationError'
  }
}
