import { IntegrationError } from './errors'
import { logIntegrationCall } from './log'
import { getGoogleAccessToken } from './google-oauth'

const SERVICE = 'sheets'
const API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

export const AKQUISE_SHEET_RANGES = ['Akquise', 'Quali-Calls', 'Sales-Calls', 'Akquise-Tracking'] as const

export function isConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() &&
      process.env.SHEETS_REFRESH_TOKEN?.trim() &&
      process.env.AKQUISE_SPREADSHEET_ID?.trim()
  )
}

function requireConfig(): { refreshToken: string; spreadsheetId: string } {
  const refreshToken = process.env.SHEETS_REFRESH_TOKEN
  const spreadsheetId = process.env.AKQUISE_SPREADSHEET_ID
  if (!isConfigured() || !refreshToken || !spreadsheetId) {
    throw new IntegrationError(
      SERVICE,
      'missing_key',
      'SHEETS_REFRESH_TOKEN/AKQUISE_SPREADSHEET_ID/GOOGLE_OAUTH_CLIENT_ID/SECRET ist nicht konfiguriert.'
    )
  }
  return { refreshToken, spreadsheetId }
}

export interface AkquiseSheetData {
  akquise: unknown[][]
  qualiCalls: unknown[][]
  salesCalls: unknown[][]
  tracking: unknown[][]
}

/**
 * Holt alle vier Akquise-Tabs in einem batchGet-Call. valueRenderOption bleibt auf dem
 * Default FORMATTED_VALUE — liefert Datums-/Zahlenstrings im selben Format, wie sie
 * bisher aus der Excel-Datei kamen (lib/domain/akquise-mapping.ts parst genau das).
 */
export async function fetchAkquiseSheetData(): Promise<AkquiseSheetData> {
  try {
    const { refreshToken, spreadsheetId } = requireConfig()
    const accessToken = await getGoogleAccessToken(SERVICE, refreshToken)

    const params = new URLSearchParams()
    for (const range of AKQUISE_SHEET_RANGES) params.append('ranges', range)

    const response = await fetch(`${API_BASE}/${spreadsheetId}/values:batchGet?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (response.status === 401 || response.status === 403) {
      throw new IntegrationError(SERVICE, 'unauthorized', 'Sheets-Zugriff verweigert — Token ungültig oder Spreadsheet nicht freigegeben.')
    }
    if (!response.ok) {
      throw new IntegrationError(SERVICE, 'upstream_error', `Sheets-API-Fehler (${response.status}).`)
    }

    const data = (await response.json()) as { valueRanges?: { values?: unknown[][] }[] }
    const [akquise, qualiCalls, salesCalls, tracking] = AKQUISE_SHEET_RANGES.map(
      (_, i) => data.valueRanges?.[i]?.values ?? []
    )

    await logIntegrationCall(SERVICE, true)
    return { akquise, qualiCalls, salesCalls, tracking }
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}
