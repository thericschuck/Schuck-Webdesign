import type { DocumentTheme } from './types'

/**
 * Standard-Theme — bildet die bisherige pdf-lib-Vorlage (`lib/pdf/invoice.ts`) nach:
 * 56pt Seitenrand ≈ 19,8mm, 10pt Grundschrift, 9pt in der Tabelle, grauer Tabellenkopf,
 * Logo oben rechts, dreispaltige Fußzeile.
 *
 * Ab Phase 7 liegen abweichende Themes in `document_themes.tokens` und werden hier
 * drübergelegt (`mergeTheme`). Dieses Objekt bleibt der Fallback, damit ein Dokument
 * auch ohne DB-Theme rendert.
 */
export const DEFAULT_THEME: DocumentTheme = {
  seite: {
    randOben: 14,
    randUnten: 26, // Platz für die dreispaltige Fußzeile
    randLinks: 20,
    randRechts: 20,
  },
  typo: {
    fliessFont: "'DM Sans', 'Segoe UI', Helvetica, Arial, sans-serif",
    ueberschriftFont: "'Playfair Display', Georgia, 'Times New Roman', serif",
    grundGroesse: 10,
    zeilenhoehe: 1.45,
    titelGroesse: 26,
    kleinGroesse: 9,
  },
  farben: {
    text: '#121212',
    grau: '#737373',
    linie: '#d4d4d4',
    akzent: '#121212',
    tabellenKopfBg: '#f2f2f2',
    zebraBg: '#fafafa',
  },
  logo: {
    anzeigen: true,
    breite: 35,
    position: 'rechts',
  },
  tabelle: {
    spalten: { pos: 6, beschreibung: 52, menge: 10, einzelpreis: 16, gesamt: 16 },
    kopfHintergrund: true,
    zebra: false,
    zeilenTrennlinien: true,
  },
  bloecke: {
    fusszeile: true,
    bankdaten: true,
    signatur: true,
    seitenzahlen: true,
  },
}

/** Beliebig tief verschachteltes Partial — für Theme-Overrides aus der DB. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

/**
 * Legt ein (ggf. unvollständiges) Theme über das Standard-Theme. Fehlende Werte
 * fallen auf den Default zurück, damit ein in der DB gespeichertes Theme nie ein
 * kaputtes Dokument erzeugen kann, wenn später neue Tokens dazukommen.
 */
export function mergeTheme(override?: DeepPartial<DocumentTheme> | null): DocumentTheme {
  if (!override) return DEFAULT_THEME
  return {
    seite: { ...DEFAULT_THEME.seite, ...override.seite },
    typo: { ...DEFAULT_THEME.typo, ...override.typo },
    farben: { ...DEFAULT_THEME.farben, ...override.farben },
    logo: { ...DEFAULT_THEME.logo, ...override.logo },
    tabelle: {
      ...DEFAULT_THEME.tabelle,
      ...override.tabelle,
      spalten: { ...DEFAULT_THEME.tabelle.spalten, ...override.tabelle?.spalten },
    },
    bloecke: { ...DEFAULT_THEME.bloecke, ...override.bloecke },
  }
}
