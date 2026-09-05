import type { DocumentRecipient } from '@/types/database'

/**
 * Formularzustand des Dokument-Editors — gemeinsam für Rechnung und Angebot.
 *
 * Bewusst nah am Dokument und nicht an der DB modelliert: was der Nutzer links
 * eintippt, ist genau das, was rechts in der Vorschau landet. Die Übersetzung
 * in DB-Felder passiert erst in der Server Action.
 */

export type DocumentKind = 'rechnung' | 'angebot'

/** Woher der Empfänger kommt. */
export type EmpfaengerModus =
  /** Aus dem Kundenstamm — Anschrift wird von dort gezogen. */
  | 'kunde'
  /** Frei eingetippt, ohne Kundendatensatz (Migration 0036). */
  | 'manuell'

export interface PositionDraft {
  /** Verknüpfter Katalogartikel, falls aus dem Produktkatalog gewählt. */
  art_nr?: string
  /** Verknüpftes Paket. */
  pkt_nr?: string
  bezeichnung: string
  beschreibung: string
  menge: number
  ep: number
  /** Überschreibt die Einzelpreis-Zelle, z.B. "25,00 € p.M.". */
  epLabel: string
  /** Überschreibt die Betrags-Zelle, z.B. "–". */
  betragLabel: string
  /** Zeile erscheint im Dokument, zählt aber nicht in die Summe. */
  excludeFromSum: boolean
}

export const LEERE_POSITION: PositionDraft = {
  bezeichnung: '',
  beschreibung: '',
  menge: 1,
  ep: 0,
  epLabel: '',
  betragLabel: '',
  excludeFromSum: false,
}

export const LEERER_EMPFAENGER: DocumentRecipient = {
  name: '',
  zusatz: '',
  strasse: '',
  plz: '',
  ort: '',
  land: 'Deutschland',
  kundennummer: '',
  email: '',
}

export interface DocumentEditorState {
  empfaengerModus: EmpfaengerModus
  clientId: string
  recipient: DocumentRecipient
  projectId: string
  /** Rechnung: Leistungsdatum. */
  serviceDate: string
  /** Angebot: Gültig bis. */
  validUntil: string
  einleitungstext: string
  schlusstext: string
  positionen: PositionDraft[]
}

/** Was an die Server Action geht — bereits bereinigt (leere Zeilen raus). */
export interface DocumentEditorPayload {
  clientId: string | null
  recipient: DocumentRecipient | null
  projectId: string | null
  serviceDate: string | null
  validUntil: string | null
  einleitungstext: string | null
  schlusstext: string | null
  positionen: PositionDraft[]
}

export type SaveResult =
  | { status: 'error'; message: string }
  | { status: 'success'; id?: string }

/** Eine Zeile zählt, sobald ein Artikel/Paket verknüpft ist oder eine Bezeichnung
 * eingetragen wurde — bewusst NICHT an "ep > 0" gekoppelt, sonst verschwänden
 * Rabattzeilen (negativer EP) und echte 0-€-Positionen beim Speichern. */
export function istEchtePosition(p: PositionDraft): boolean {
  return Boolean(p.art_nr) || Boolean(p.pkt_nr) || p.bezeichnung.trim().length > 0
}

/** Nettosumme — muss dieselbe Regel anwenden wie `sumItems` im Domain-Layer,
 * sonst zeigt die Vorschau eine andere Summe als das gespeicherte Dokument. */
export function summe(positionen: PositionDraft[]): number {
  const total = positionen
    .filter((p) => istEchtePosition(p) && !p.excludeFromSum)
    .reduce((sum, p) => sum + (p.menge || 0) * (p.ep || 0), 0)
  return Math.round(total * 100) / 100
}

/** Baut aus dem Formularzustand die Nutzlast für die Server Action. */
export function toPayload(state: DocumentEditorState): DocumentEditorPayload {
  const manuell = state.empfaengerModus === 'manuell'
  return {
    clientId: manuell ? null : state.clientId || null,
    recipient: manuell ? state.recipient : null,
    projectId: manuell ? null : state.projectId || null,
    serviceDate: state.serviceDate || null,
    validUntil: state.validUntil || null,
    einleitungstext: state.einleitungstext.trim() || null,
    schlusstext: state.schlusstext.trim() || null,
    positionen: state.positionen.filter(istEchtePosition),
  }
}
