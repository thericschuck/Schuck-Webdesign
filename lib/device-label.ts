/**
 * Macht aus einem User-Agent-String einen lesbaren Gerätenamen für die Push-Geräteliste
 * ("Chrome auf Windows"). Bewusst grob und ohne Bibliothek: es geht nur darum, dass Eric
 * bzw. ein Kunde in den Einstellungen erkennt, welcher Eintrag welches Gerät ist, um ein
 * altes Abo entfernen zu können. Reihenfolge der Prüfungen ist wichtig, weil sich fast
 * jeder Browser als "Safari" und die meisten als "Chrome" ausgeben.
 */
export function deviceLabelFromUserAgent(userAgent: string | null | undefined): string {
  const ua = userAgent ?? ''
  if (!ua) return 'Unbekanntes Gerät'

  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Firefox\/|FxiOS/.test(ua) ? 'Firefox'
    : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Chrome\/|CriOS/.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Browser'

  const platform =
    /iPhone/.test(ua) ? 'iPhone'
    : /iPad/.test(ua) ? 'iPad'
    : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows'
    : /Macintosh|Mac OS X/.test(ua) ? 'Mac'
    : /Linux/.test(ua) ? 'Linux'
    : null

  return platform ? `${browser} auf ${platform}` : browser
}
