/**
 * Datenmodell des Dokument-Renderers.
 *
 * Bewusst ENTKOPPELT von den DB-Typen: `DocumentData` beschreibt, was auf dem Papier
 * steht, nicht wie es in Postgres liegt. Die Übersetzung passiert in `from-invoice.ts`
 * und `from-offer.ts`. Dadurch kann derselbe Renderer Rechnung, Angebot und Gutschrift
 * ausgeben, ohne dass er `invoices`/`offers` kennen muss — und der Vorlagen-Editor kann
 * mit Beispieldaten arbeiten, ohne die DB anzufassen.
 */

export type DocumentKind = 'rechnung' | 'angebot' | 'gutschrift'

/** Eine Position der Leistungstabelle. */
export interface DocumentPosition {
  pos: number
  artNr?: string | null
  titel: string
  /** Mehrzeilig erlaubt — `\n` wird beim Rendern zu einem Zeilenumbruch. */
  beschreibung?: string | null
  menge: number
  einzelpreis: number
  gesamt: number
  /** Überschreibt die Einzelpreis-Zelle, z.B. "25 € p.M." statt "25,00 €". */
  einzelpreisLabel?: string | null
  /** Überschreibt die Betrags-Zelle, z.B. "–" bei laufenden Care-Positionen. */
  betragLabel?: string | null
  /** Zeile erscheint in der Tabelle, zählt aber nicht in die Summe (z.B. Abo-Hinweis). */
  excludeFromSum?: boolean
}

/** Empfänger des Dokuments. */
export interface DocumentParty {
  name: string
  /** Firma als zweite Zeile, wenn `name` bereits eine Person ist. */
  zusatz?: string | null
  strasse?: string | null
  plz?: string | null
  ort?: string | null
  land?: string | null
}

/** Absender — gespiegelt aus `company_settings`. */
export interface DocumentSender {
  firma: string
  inhaber?: string | null
  strasse?: string | null
  plz?: string | null
  ort?: string | null
  land?: string | null
  email?: string | null
  telefon?: string | null
  website?: string | null
  iban?: string | null
  bic?: string | null
  bankName?: string | null
  steuernummer?: string | null
  ustId?: string | null
}

/** Eine Zeile im Metablock rechts oben (Datum, Nummern, Fristen). */
export interface DocumentMetaRow {
  label: string
  value: string
}

/** Summenblock. Bei §19 UStG bleiben `ustSatz`/`ustBetrag`/`brutto` null. */
export interface DocumentSumme {
  netto: number
  ustPflichtig: boolean
  ustSatz: number | null
  ustBetrag: number | null
  brutto: number | null
}

export interface DocumentData {
  kind: DocumentKind
  /** Überschrift auf dem Dokument, z.B. "Rechnung". */
  titel: string
  /** Dokumentnummer. `null` = noch nicht vergeben (Entwurf). */
  nummer: string | null
  /** Zeigt das Entwurfs-Wasserzeichen und unterdrückt die Nummer. */
  entwurf: boolean
  empfaenger: DocumentParty
  absender: DocumentSender
  /** Metablock rechts oben. */
  meta: DocumentMetaRow[]
  anrede?: string | null
  einleitungstext?: string | null
  positionen: DocumentPosition[]
  summe: DocumentSumme
  /** Pflicht-/Rechtshinweise unter der Summe (§19 UStG, Zahlungsziel, Gültigkeit). */
  hinweise: string[]
  schlusstext?: string | null
  grussformel?: string | null
  /** Name unter der Grußformel. */
  unterschrift?: string | null
}

// ── Theme ───────────────────────────────────────────────────────────────────

/**
 * Alle Layout-Stellschrauben an einem Ort. Das CSS wird vollständig hieraus
 * abgeleitet (`css.ts`) — es gibt keine hartcodierten Maße im Renderer. Genau
 * deshalb kann der Vorlagen-Editor das Layout ändern, ohne dass Code deployt wird.
 *
 * Längenangaben in mm, Schriftgrößen in pt — dieselben Einheiten, die man in Word
 * gewohnt ist, damit sich eine nachgebaute Vorlage 1:1 übertragen lässt.
 */
export interface DocumentTheme {
  seite: {
    randOben: number
    randUnten: number
    randLinks: number
    randRechts: number
  }
  typo: {
    /** Font-Stack für Fließtext. */
    fliessFont: string
    /** Font-Stack für Überschriften. */
    ueberschriftFont: string
    /** Grundschriftgröße in pt. Alle anderen Größen sind relativ dazu. */
    grundGroesse: number
    zeilenhoehe: number
    /** Größe der Dokumentüberschrift ("Rechnung") in pt. */
    titelGroesse: number
    /** Größe in der Positionstabelle und im Metablock in pt. */
    kleinGroesse: number
  }
  farben: {
    text: string
    grau: string
    linie: string
    akzent: string
    tabellenKopfBg: string
    zebraBg: string
  }
  logo: {
    anzeigen: boolean
    /** Breite in mm. */
    breite: number
    position: 'links' | 'rechts'
  }
  tabelle: {
    /** Spaltenbreiten in Prozent — müssen zusammen 100 ergeben. */
    spalten: {
      pos: number
      beschreibung: number
      menge: number
      einzelpreis: number
      gesamt: number
    }
    kopfHintergrund: boolean
    zebra: boolean
    zeilenTrennlinien: boolean
  }
  bloecke: {
    fusszeile: boolean
    bankdaten: boolean
    signatur: boolean
    seitenzahlen: boolean
  }
}

/** Rendermodus — der einzige Unterschied zwischen Vorschau und PDF. */
export type RenderMode =
  /** Browser: Paged.js-Polyfill wird eingebunden, damit Seitenumbrüche sichtbar werden. */
  | 'preview'
  /** Headless Chrome: kein Polyfill, Chrome paginiert selbst beim `page.pdf()`. */
  | 'print'
