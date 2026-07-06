import { IntegrationError } from './errors'
import { logIntegrationCall } from './log'

const SERVICE = 'vapi'
const API_BASE = 'https://api.vapi.ai'

export function isConfigured(): boolean {
  return Boolean(process.env.VAPI_API_KEY?.trim())
}

function requireKey(): string {
  const key = process.env.VAPI_API_KEY
  if (!key) throw new IntegrationError(SERVICE, 'missing_key', 'VAPI_API_KEY ist nicht konfiguriert.')
  return key
}

interface VapiCall {
  id: string
  assistantId?: string
  startedAt?: string
  endedAt?: string
  endedReason?: string
  cost?: number
  summary?: string
}

async function listCalls(limit: number, assistantId?: string): Promise<VapiCall[]> {
  const key = requireKey()
  const params = new URLSearchParams({ limit: String(limit) })
  if (assistantId) params.set('assistantId', assistantId)

  const response = await fetch(`${API_BASE}/call?${params.toString()}`, { headers: { Authorization: `Bearer ${key}` } })

  if (response.status === 401 || response.status === 403) {
    throw new IntegrationError(SERVICE, 'unauthorized', 'VAPI_API_KEY ist ungültig oder ohne Berechtigung.')
  }
  if (!response.ok) {
    throw new IntegrationError(SERVICE, 'upstream_error', `Vapi-API-Fehler (${response.status}).`)
  }
  return (await response.json()) as VapiCall[]
}

export interface CallLogEntry {
  id: string
  startedAt: string | null
  endedAt: string | null
  endedReason: string | null
  cost: number | null
  summary: string | null
}

export async function getCallLogs(limit = 20, assistantId?: string): Promise<CallLogEntry[]> {
  try {
    const calls = await listCalls(limit, assistantId)
    const result = calls.map((call) => ({
      id: call.id,
      startedAt: call.startedAt ?? null,
      endedAt: call.endedAt ?? null,
      endedReason: call.endedReason ?? null,
      cost: call.cost ?? null,
      summary: call.summary ?? null,
    }))
    await logIntegrationCall(SERVICE, true)
    return result
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}

export interface CallStats {
  totalCalls: number
  totalCost: number
  averageDurationSeconds: number | null
  endedReasonBreakdown: Record<string, number>
}

/** Aggregiert einfache Statistiken über die letzten Calls (Vapi bietet keinen dedizierten Stats-Endpunkt). */
export async function getStats(assistantId?: string, sampleSize = 100): Promise<CallStats> {
  try {
    const calls = await listCalls(sampleSize, assistantId)

    let totalCost = 0
    let totalDurationSeconds = 0
    let durationSamples = 0
    const endedReasonBreakdown: Record<string, number> = {}

    for (const call of calls) {
      if (typeof call.cost === 'number') totalCost += call.cost
      if (call.startedAt && call.endedAt) {
        const durationMs = new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()
        if (durationMs > 0) {
          totalDurationSeconds += durationMs / 1000
          durationSamples += 1
        }
      }
      const reason = call.endedReason ?? 'unbekannt'
      endedReasonBreakdown[reason] = (endedReasonBreakdown[reason] ?? 0) + 1
    }

    const result: CallStats = {
      totalCalls: calls.length,
      totalCost: Math.round(totalCost * 100) / 100,
      averageDurationSeconds: durationSamples > 0 ? Math.round(totalDurationSeconds / durationSamples) : null,
      endedReasonBreakdown,
    }
    await logIntegrationCall(SERVICE, true)
    return result
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}
