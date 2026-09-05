/**
 * Supabase akzeptiert als `redirectTo` nur absolute URLs MIT Schema. Steht in
 * NEXT_PUBLIC_SITE_URL nur die nackte Domain ("schuck-webdesign.de"), verwirft GoTrue
 * den Wert stillschweigend und schickt den Kunden stattdessen an die im Supabase-
 * Dashboard hinterlegte Site-URL — der Einladungslink zeigt dann z.B. auf localhost.
 * Deshalb hier defensiv normalisieren statt sich auf das Env-Format zu verlassen.
 *
 * Wichtig: Der zurückgegebene Wert muss EXAKT so in der Supabase-Redirect-Allowlist
 * stehen. Steht dort nur die apex-Domain, die Domain leitet aber per 30x auf `www`
 * weiter, geht das Token-Fragment (#access_token=…) in manchen In-App-Browsern
 * verloren — deshalb sollte NEXT_PUBLIC_SITE_URL immer die Domain sein, die der
 * Host am Ende wirklich ausliefert (hier: www).
 */
export function authCallbackUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '')
  if (!raw) throw new Error('NEXT_PUBLIC_SITE_URL fehlt in der Umgebung.')
  const base = /^https?:\/\//.test(raw) ? raw : `https://${raw}`
  return `${base}/auth/callback`
}
