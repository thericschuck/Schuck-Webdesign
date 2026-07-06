import { IntegrationError } from './errors'
import { logIntegrationCall } from './log'

const SERVICE = 'uptime'
const API_BASE = 'https://api.uptimerobot.com/v2'

const STATUS_LABELS: Record<number, string> = {
  0: 'paused',
  1: 'not_checked',
  2: 'up',
  8: 'seems_down',
  9: 'down',
}

export function isConfigured(): boolean {
  return Boolean(process.env.UPTIMEROBOT_API_KEY?.trim())
}

function requireKey(): string {
  const key = process.env.UPTIMEROBOT_API_KEY
  if (!key) throw new IntegrationError(SERVICE, 'missing_key', 'UPTIMEROBOT_API_KEY ist nicht konfiguriert.')
  return key
}

interface UptimeRobotLog {
  type: number
  datetime: number
  duration: number
  reason?: { detail?: string }
}

interface UptimeRobotMonitor {
  id: number
  friendly_name: string
  url: string
  status: number
  custom_uptime_ratio?: string
  logs?: UptimeRobotLog[]
}

async function getMonitors(search: string, extraParams: Record<string, string> = {}): Promise<UptimeRobotMonitor[]> {
  const key = requireKey()
  const body = new URLSearchParams({ api_key: key, format: 'json', search, custom_uptime_ratios: '30', ...extraParams })

  const response = await fetch(`${API_BASE}/getMonitors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new IntegrationError(SERVICE, 'upstream_error', `UptimeRobot-API-Fehler (${response.status}).`)
  }

  const data = (await response.json()) as { stat: string; error?: { message?: string }; monitors?: UptimeRobotMonitor[] }
  if (data.stat !== 'ok') {
    const message = data.error?.message ?? 'Unbekannter Fehler'
    if (/api key/i.test(message)) {
      throw new IntegrationError(SERVICE, 'unauthorized', `UPTIMEROBOT_API_KEY ist ungültig: ${message}`)
    }
    throw new IntegrationError(SERVICE, 'upstream_error', `UptimeRobot-Fehler: ${message}`)
  }
  return data.monitors ?? []
}

export interface MonitorStatus {
  friendlyName: string
  url: string
  status: string
  uptimeRatio30d: string | null
}

/** Sucht einen Monitor per Domain/Name und liefert seinen aktuellen Status. */
export async function getStatus(search: string): Promise<MonitorStatus | null> {
  try {
    const monitors = await getMonitors(search)
    const monitor = monitors[0]
    const result = monitor
      ? {
          friendlyName: monitor.friendly_name,
          url: monitor.url,
          status: STATUS_LABELS[monitor.status] ?? 'unknown',
          uptimeRatio30d: monitor.custom_uptime_ratio ?? null,
        }
      : null
    await logIntegrationCall(SERVICE, true)
    return result
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}

export interface IncidentEntry {
  type: string
  datetime: string
  durationSeconds: number
  reason: string | null
}

const LOG_TYPE_LABELS: Record<number, string> = { 1: 'down', 2: 'up', 98: 'paused', 99: 'started' }

/** Liefert die letzten Incidents (Down/Up-Wechsel) eines Monitors. */
export async function getIncidents(search: string, limit = 10): Promise<IncidentEntry[]> {
  try {
    const monitors = await getMonitors(search, { logs: '1' })
    const logs = monitors[0]?.logs ?? []
    const result = logs.slice(0, limit).map((log) => ({
      type: LOG_TYPE_LABELS[log.type] ?? `unbekannt (${log.type})`,
      datetime: new Date(log.datetime * 1000).toISOString(),
      durationSeconds: log.duration,
      reason: log.reason?.detail ?? null,
    }))
    await logIntegrationCall(SERVICE, true)
    return result
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}
