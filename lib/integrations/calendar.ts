import { IntegrationError } from './errors'
import { logIntegrationCall } from './log'
import { getGoogleAccessToken } from './google-oauth'

const SERVICE = 'calendar'
const API_BASE = 'https://www.googleapis.com/calendar/v3'

export function isConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_CALENDAR_REFRESH_TOKEN?.trim()
  )
}

async function getAccessToken(): Promise<string> {
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
  if (!isConfigured() || !refreshToken) {
    throw new IntegrationError(SERVICE, 'missing_key', 'GOOGLE_CALENDAR_REFRESH_TOKEN/GOOGLE_OAUTH_CLIENT_ID/SECRET ist nicht konfiguriert.')
  }
  return getGoogleAccessToken(SERVICE, refreshToken)
}

export interface BusySlot {
  start: string
  end: string
}

export interface AvailabilityResult {
  calendarId: string
  from: string
  to: string
  busy: BusySlot[]
  isFullyFree: boolean
}

export async function checkAvailability(fromISO: string, toISO: string, calendarId = 'primary'): Promise<AvailabilityResult> {
  try {
    const accessToken = await getAccessToken()
    const response = await fetch(`${API_BASE}/freeBusy`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMin: fromISO, timeMax: toISO, items: [{ id: calendarId }] }),
    })

    if (response.status === 401 || response.status === 403) {
      throw new IntegrationError(SERVICE, 'unauthorized', 'Google-Calendar-Zugriff verweigert — Token ungültig oder ohne Berechtigung.')
    }
    if (!response.ok) {
      throw new IntegrationError(SERVICE, 'upstream_error', `Google-Calendar-API-Fehler (${response.status}).`)
    }

    const data = (await response.json()) as { calendars?: Record<string, { busy?: BusySlot[]; errors?: unknown[] }> }
    const calendar = data.calendars?.[calendarId]
    const busy = calendar?.busy ?? []

    const result: AvailabilityResult = { calendarId, from: fromISO, to: toISO, busy, isFullyFree: busy.length === 0 }
    await logIntegrationCall(SERVICE, true)
    return result
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}
