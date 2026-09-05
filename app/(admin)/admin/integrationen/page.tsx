import { createAdminClient } from '@/lib/supabase/admin'
import { INTEGRATIONS, getExpiryStatus } from '@/lib/integrations/registry'
import { getIntegrationSettings } from '@/lib/integrations/settings'
import { setTokenIssuedAt } from './actions'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDay(date: Date) {
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function IntegrationenPage() {
  const adminClient = createAdminClient()
  const [{ data: calls }, settings] = await Promise.all([
    adminClient.from('integration_calls').select('service, success, error_message, called_at').order('called_at', { ascending: false }).limit(500),
    getIntegrationSettings(),
  ])

  const latestByService = new Map<string, { success: boolean; error_message: string | null; called_at: string }>()
  for (const call of calls ?? []) {
    if (!latestByService.has(call.service)) latestByService.set(call.service, call)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Integrationen
        </h1>
        <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Status externer Dienste (Bereich 7) — welche sind konfiguriert, wann war der letzte Aufruf.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* overflow-hidden oben bleibt für die runden Ecken; das horizontale
            Scrollen passiert in diesem inneren Wrapper — sonst waren die
            rechten Spalten (Ablauf, Status) auf schmalen Screens weder
            sichtbar noch per Scroll erreichbar. */}
        <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wider">
              <th className="px-5 py-3 font-medium">Dienst</th>
              <th className="px-5 py-3 font-medium">Konfiguriert</th>
              <th className="px-5 py-3 font-medium">Ablauf</th>
              <th className="px-5 py-3 font-medium">Letzter Call</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {INTEGRATIONS.map((integration) => {
              const configured = integration.isConfigured()
              const lastCall = latestByService.get(integration.service)
              const expiry = getExpiryStatus(integration, settings)

              return (
                <tr key={integration.service}>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">{integration.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{integration.envVars.join(', ')}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        configured ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {configured ? 'Ja' : 'Nicht konfiguriert'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {!integration.expiry ? (
                      <span className="text-xs text-gray-300">—</span>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {expiry?.status === 'unknown' ? (
                          <span className="text-xs text-gray-400">Ausstellungsdatum fehlt</span>
                        ) : (
                          expiry && (
                            <div>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  expiry.status === 'expired'
                                    ? 'bg-red-50 text-red-700'
                                    : expiry.status === 'warning'
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-green-50 text-green-700'
                                }`}
                              >
                                {expiry.status === 'expired' ? `Abgelaufen (${fmtDay(expiry.expiresAt)})` : `${expiry.daysRemaining} Tage`}
                              </span>
                              {expiry.status !== 'expired' && <p className="text-xs text-gray-400 mt-1">bis {fmtDay(expiry.expiresAt)}</p>}
                            </div>
                          )
                        )}
                        <form action={setTokenIssuedAt.bind(null, integration.service, integration.expiry.settingKey)} className="flex items-center gap-1.5">
                          <input
                            type="date"
                            name="issued_at"
                            required
                            title="Datum, an dem der Token erzeugt wurde"
                            className="text-xs rounded-lg border border-gray-200 px-2 py-1 text-gray-700"
                          />
                          <button
                            type="submit"
                            className="text-xs px-2 py-1 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors shrink-0"
                          >
                            {expiry?.status === 'unknown' ? 'Setzen' : 'Aktualisieren'}
                          </button>
                        </form>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{lastCall ? fmtDate(lastCall.called_at) : '—'}</td>
                  <td className="px-5 py-3.5">
                    {!lastCall ? (
                      <span className="text-xs text-gray-400">Noch kein Aufruf</span>
                    ) : lastCall.success ? (
                      <div>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700">Erfolgreich</span>
                        {lastCall.error_message && <p className="text-xs text-gray-400 mt-1 max-w-md truncate" title={lastCall.error_message}>{lastCall.error_message}</p>}
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-700">Fehler</span>
                        {lastCall.error_message && <p className="text-xs text-gray-400 mt-1 max-w-md truncate">{lastCall.error_message}</p>}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
