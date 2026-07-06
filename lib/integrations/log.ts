import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Protokolliert jeden Integrationsaufruf (Erfolg wie Fehler) in
 * integration_calls — Datengrundlage für die Status-Seite /admin/integrationen
 * ("letzter erfolgreicher Call"). Wirft nie, damit ein Logging-Fehler nie den
 * eigentlichen Integrationsaufruf zum Scheitern bringt.
 */
export async function logIntegrationCall(service: string, success: boolean, errorMessage?: string): Promise<void> {
  try {
    const adminClient = createAdminClient()
    await adminClient.from('integration_calls').insert({
      service,
      success,
      error_message: errorMessage ?? null,
    })
  } catch (err) {
    console.error('[logIntegrationCall] Logging fehlgeschlagen:', err)
  }
}
