/**
 * Namens-Priorität: profiles.full_name (Portal-Identität, falls eingeladen) > clients.contact_name
 * (vom Admin erfasster Ansprechpartner, auch ohne Einladung) > clients.company_name > "Unbekannt".
 */
export function clientDisplayName(fullName?: string | null, contactName?: string | null, companyName?: string | null): string {
  return fullName?.trim() || contactName?.trim() || companyName?.trim() || 'Unbekannt'
}

/** Firma nur als Zusatz zurückgeben, wenn ein Name vorhanden ist (sonst ist company_name bereits der Anzeigename selbst). */
export function clientDisplaySubtitle(fullName?: string | null, contactName?: string | null, companyName?: string | null): string | null {
  const name = fullName?.trim() || contactName?.trim()
  const company = companyName?.trim()
  return name && company ? company : null
}
