import { IntegrationError } from './errors'

/**
 * Gemeinsamer Token-Refresh für alle Google-Dienste (GSC, GBP, Calendar).
 * Es gibt bewusst KEINEN interaktiven OAuth-Consent-Flow — Eric erzeugt den
 * Refresh-Token einmalig manuell (z.B. via Google OAuth Playground) und trägt
 * ihn in .env.local ein. Ohne Refresh-Token/Client-Credentials gilt der
 * jeweilige Dienst als "nicht konfiguriert".
 */
export async function getGoogleAccessToken(service: string, refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new IntegrationError(service, 'missing_key', 'GOOGLE_OAUTH_CLIENT_ID/SECRET ist nicht konfiguriert.')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (response.status === 401 || response.status === 400) {
    throw new IntegrationError(service, 'unauthorized', 'Google-Refresh-Token ist ungültig oder abgelaufen.')
  }
  if (!response.ok) {
    throw new IntegrationError(service, 'upstream_error', `Google-Token-Refresh fehlgeschlagen (${response.status}).`)
  }

  const data = (await response.json()) as { access_token?: string }
  if (!data.access_token) {
    throw new IntegrationError(service, 'upstream_error', 'Google-Token-Refresh lieferte kein access_token.')
  }
  return data.access_token
}
