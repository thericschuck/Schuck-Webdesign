export const KATEGORIE_ORDER = ['Website Core', 'Website Extra', 'Betrieb', 'Care', 'SEO', 'Telefonbot', 'Add-on']

export const KATEGORIE_PREFIX: Record<string, string> = {
  'Website Core': 'SW',
  'Website Extra': 'EX',
  Betrieb: 'EX-B',
  Care: 'CP',
  SEO: 'SE',
  Telefonbot: 'TB',
  'Add-on': 'AD',
}

export const TYP_OPTIONS = ['Einmalig', 'Monatlich']

/** Kurzcode + Farbe je Kategorie für den kleinen Icon-Chip vor Kategorie-Überschrift/Artikelname —
 * rein visuelle Gliederung, damit die Liste nicht nur aus Fließtext-Zeilen besteht. */
export const KATEGORIE_COLOR: Record<string, { bg: string; text: string }> = {
  'Website Core': { bg: 'bg-blue-50', text: 'text-blue-700' },
  'Website Extra': { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  Betrieb: { bg: 'bg-gray-100', text: 'text-gray-600' },
  Care: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  SEO: { bg: 'bg-amber-50', text: 'text-amber-700' },
  Telefonbot: { bg: 'bg-violet-50', text: 'text-violet-700' },
  'Add-on': { bg: 'bg-pink-50', text: 'text-pink-700' },
}

export const KATEGORIE_COLOR_FALLBACK = { bg: 'bg-gray-100', text: 'text-gray-500' }

export function kategorieChip(kategorie: string): { code: string; bg: string; text: string } {
  const color = KATEGORIE_COLOR[kategorie] ?? KATEGORIE_COLOR_FALLBACK
  const code = KATEGORIE_PREFIX[kategorie] ?? kategorie.slice(0, 2).toUpperCase()
  return { code, ...color }
}
