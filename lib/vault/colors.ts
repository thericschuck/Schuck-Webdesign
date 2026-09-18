/**
 * Feste Farbpalette für Ordner & Tags im Tresor — bewusst Tokens statt Freitext-Hex,
 * damit die UI (Sidebar, Avatare, Chips) konsistent bleibt. Die Klassen müssen als
 * volle literale Strings hier stehen (nicht per Template zusammengebaut), sonst
 * erkennt Tailwinds Scanner sie nicht und die Klassen fehlen im Build.
 */
export const FOLDER_COLOR_KEYS = [
  'gray',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'emerald',
  'teal',
  'cyan',
  'blue',
  'indigo',
  'violet',
  'purple',
  'pink',
  'rose',
] as const

export type FolderColorKey = (typeof FOLDER_COLOR_KEYS)[number]

interface ColorClasses {
  dot: string
  bg: string
  text: string
  ring: string
}

const FOLDER_COLOR_CLASSES: Record<FolderColorKey, ColorClasses> = {
  gray: { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-700', ring: 'ring-gray-400' },
  red: { dot: 'bg-red-400', bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-400' },
  orange: { dot: 'bg-orange-400', bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-400' },
  amber: { dot: 'bg-amber-400', bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-400' },
  yellow: { dot: 'bg-yellow-400', bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-400' },
  lime: { dot: 'bg-lime-400', bg: 'bg-lime-100', text: 'text-lime-700', ring: 'ring-lime-400' },
  emerald: { dot: 'bg-emerald-400', bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-400' },
  teal: { dot: 'bg-teal-400', bg: 'bg-teal-100', text: 'text-teal-700', ring: 'ring-teal-400' },
  cyan: { dot: 'bg-cyan-400', bg: 'bg-cyan-100', text: 'text-cyan-700', ring: 'ring-cyan-400' },
  blue: { dot: 'bg-blue-400', bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-400' },
  indigo: { dot: 'bg-indigo-400', bg: 'bg-indigo-100', text: 'text-indigo-700', ring: 'ring-indigo-400' },
  violet: { dot: 'bg-violet-400', bg: 'bg-violet-100', text: 'text-violet-700', ring: 'ring-violet-400' },
  purple: { dot: 'bg-purple-400', bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-400' },
  pink: { dot: 'bg-pink-400', bg: 'bg-pink-100', text: 'text-pink-700', ring: 'ring-pink-400' },
  rose: { dot: 'bg-rose-400', bg: 'bg-rose-100', text: 'text-rose-700', ring: 'ring-rose-400' },
}

export function isFolderColorKey(value: string | null | undefined): value is FolderColorKey {
  return !!value && (FOLDER_COLOR_KEYS as readonly string[]).includes(value)
}

export function colorClasses(color: string | null | undefined): ColorClasses {
  return FOLDER_COLOR_CLASSES[isFolderColorKey(color) ? color : 'gray']
}
