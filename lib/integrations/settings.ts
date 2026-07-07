import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Nicht-geheime, editierbare Integrations-Werte (z.B. "Figma-Token erzeugt am") — bewusst
 * NICHT in .env.local, damit sie ohne Server-Neustart/Datei-Edit über /admin/integrationen
 * gesetzt werden können.
 */
export async function getIntegrationSettings(): Promise<Map<string, string>> {
  const adminClient = createAdminClient()
  const { data } = await adminClient.from('integration_settings').select('service, key, value')

  const map = new Map<string, string>()
  for (const row of data ?? []) {
    if (row.value) map.set(`${row.service}:${row.key}`, row.value)
  }
  return map
}

export async function setIntegrationSetting(service: string, key: string, value: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('integration_settings').upsert({ service, key, value })
  if (error) throw new Error(error.message)
}
