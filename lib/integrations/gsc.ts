import { IntegrationError } from './errors'
import { logIntegrationCall } from './log'
import { getGoogleAccessToken } from './google-oauth'

const SERVICE = 'gsc'
const API_BASE = 'https://www.googleapis.com/webmasters/v3'

export function isConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() &&
      process.env.GSC_REFRESH_TOKEN?.trim()
  )
}

function requireRefreshToken(): string {
  const token = process.env.GSC_REFRESH_TOKEN
  if (!isConfigured() || !token) {
    throw new IntegrationError(SERVICE, 'missing_key', 'GSC_REFRESH_TOKEN/GOOGLE_OAUTH_CLIENT_ID/SECRET ist nicht konfiguriert.')
  }
  return token
}

function defaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 28)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { startDate: iso(start), endDate: iso(end) }
}

export interface PerformanceRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface PerformanceResult {
  siteUrl: string
  startDate: string
  endDate: string
  rows: PerformanceRow[]
}

/** Top-Suchanfragen für eine Property über den Zeitraum (Default: letzte 28 Tage). */
export async function getPerformance(siteUrl: string, fromDate?: string, toDate?: string): Promise<PerformanceResult> {
  try {
    const refreshToken = requireRefreshToken()
    const accessToken = await getGoogleAccessToken(SERVICE, refreshToken)
    const { startDate, endDate } = fromDate && toDate ? { startDate: fromDate, endDate: toDate } : defaultDateRange()

    const response = await fetch(`${API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, dimensions: ['query'], rowLimit: 10 }),
    })

    if (response.status === 401 || response.status === 403) {
      throw new IntegrationError(SERVICE, 'unauthorized', 'GSC-Zugriff verweigert — Property nicht mit dem Account verknüpft oder Token ungültig.')
    }
    if (!response.ok) {
      throw new IntegrationError(SERVICE, 'upstream_error', `Search-Console-API-Fehler (${response.status}).`)
    }

    const data = (await response.json()) as { rows?: PerformanceRow[] }
    const result: PerformanceResult = { siteUrl, startDate, endDate, rows: data.rows ?? [] }
    await logIntegrationCall(SERVICE, true)
    return result
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}
