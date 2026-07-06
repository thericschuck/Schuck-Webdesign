/**
 * Kundenname (profiles.full_name) ist die primäre Bezeichnung, Firmenname
 * (clients.company_name) ist optionale Zusatzinfo — nie umgekehrt.
 */
export function clientDisplayName(fullName?: string | null, companyName?: string | null): string {
  return fullName?.trim() || companyName?.trim() || 'Unbekannt'
}

/** Firma nur als Zusatz zurückgeben, wenn ein Name vorhanden ist (sonst ist company_name bereits der Anzeigename selbst). */
export function clientDisplaySubtitle(fullName?: string | null, companyName?: string | null): string | null {
  const name = fullName?.trim()
  const company = companyName?.trim()
  return name && company ? company : null
}
