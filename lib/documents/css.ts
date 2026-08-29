import type { DocumentTheme } from './types'
import { DM_SANS_WOFF2, PLAYFAIR_WOFF2 } from './assets.generated'

/**
 * Entschärft einen Theme-Wert, bevor er ins Stylesheet geht.
 *
 * Ab Phase 7 kommen Farben und Font-Stacks aus `document_themes` in der DB.
 * Ein Wert wie `red</style><script>…` würde sonst aus dem `<style>`-Block
 * ausbrechen — und das Vorschau-iframe läuft aus technischen Gründen mit
 * `allow-same-origin` (Paged.js paginiert ohne diese Freigabe nicht), hätte
 * also Zugriff auf die Admin-Oberfläche. `<` und `>` zu entfernen schließt
 * den Ausbruch; die restlichen CSS-Sonderzeichen können höchstens das eigene
 * Layout verunstalten, was beim Speichern sofort auffällt.
 */
function cssWert(value: string | number): string {
  return String(value).replace(/[<>]/g, '')
}

/**
 * Erzeugt das komplette Stylesheet aus dem Theme. Es gibt bewusst KEINE Maße im
 * Renderer selbst — wer das Layout ändern will, ändert Theme-Tokens, nicht HTML.
 *
 * Die Layoutstabilität hängt an vier Regelgruppen, die weiter unten einzeln
 * kommentiert sind. Zusammen verhindern sie das Word-Problem: dass sich beim
 * Befüllen mit variabel langem Text irgendwas mitten durch einen Block schiebt.
 */
export function buildCss(theme: DocumentTheme): string {
  const { logo, tabelle, bloecke } = theme

  // Alle Werte, die als Text ins Stylesheet gehen, einmal zentral entschärfen —
  // Zahlen über Number() (eine als String getarnte CSS-Injektion wird so zu
  // NaN statt zu Code), Farben und Font-Stacks über cssWert().
  const zahl = (v: number) => (Number.isFinite(Number(v)) ? Number(v) : 0)
  const seite = {
    randOben: zahl(theme.seite.randOben),
    randUnten: zahl(theme.seite.randUnten),
    randLinks: zahl(theme.seite.randLinks),
    randRechts: zahl(theme.seite.randRechts),
  }
  const typo = {
    fliessFont: cssWert(theme.typo.fliessFont),
    ueberschriftFont: cssWert(theme.typo.ueberschriftFont),
    grundGroesse: zahl(theme.typo.grundGroesse),
    zeilenhoehe: zahl(theme.typo.zeilenhoehe),
    titelGroesse: zahl(theme.typo.titelGroesse),
    kleinGroesse: zahl(theme.typo.kleinGroesse),
  }
  const farben = {
    text: cssWert(theme.farben.text),
    grau: cssWert(theme.farben.grau),
    linie: cssWert(theme.farben.linie),
    akzent: cssWert(theme.farben.akzent),
    tabellenKopfBg: cssWert(theme.farben.tabellenKopfBg),
    zebraBg: cssWert(theme.farben.zebraBg),
  }
  const spalten = {
    pos: zahl(tabelle.spalten.pos),
    beschreibung: zahl(tabelle.spalten.beschreibung),
    menge: zahl(tabelle.spalten.menge),
    einzelpreis: zahl(tabelle.spalten.einzelpreis),
    gesamt: zahl(tabelle.spalten.gesamt),
  }

  return `
/* ── Eingebettete Schriften ────────────────────────────────────────────────
   Als Data-URI, weil die PDF-Erzeugung in einer Vercel-Function ohne
   System-Fonts läuft. Beide sind Variable Fonts, daher deckt eine Datei
   den ganzen Bereich 400–700 ab. */
@font-face {
  font-family: 'Playfair Display';
  font-style: normal;
  font-weight: 400 700;
  font-display: block;
  src: url('${PLAYFAIR_WOFF2}') format('woff2');
}
@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 400 700;
  font-display: block;
  src: url('${DM_SANS_WOFF2}') format('woff2');
}

/* ── Seite ─────────────────────────────────────────────────────────────── */
@page {
  size: A4;
  margin: ${seite.randOben}mm ${seite.randRechts}mm ${seite.randUnten}mm ${seite.randLinks}mm;
${
  bloecke.seitenzahlen
    ? `  /* Seitenzahlen: im Browser übernimmt das Paged.js (Margin-Boxen), im PDF
     Puppeteers footerTemplate. Beide Texte kommen aus derselben Quelle,
     siehe buildSeitenzahlHtml() in render.ts. */
  @bottom-right {
    content: 'Seite ' counter(page) ' von ' counter(pages);
    font-family: ${typo.fliessFont};
    font-size: ${typo.kleinGroesse - 1}pt;
    color: ${farben.grau};
    margin-bottom: 6mm;
  }`
    : ''
}
}

* { box-sizing: border-box; }

/* Ein Dokument ist immer hell. Ohne diese Festlegung wendet Chrome auf einem
   System im Dunkelmodus seine automatische Invertierung an — der Hintergrund
   wird dunkel, die in ${farben.text} gesetzte Schrift bleibt dunkel und ist
   damit unsichtbar. Betrifft sowohl die Vorschau auf Erics Rechner als auch
   Headless Chrome. */
:root { color-scheme: light only; }

html, body {
  margin: 0;
  padding: 0;
  background: #ffffff;
}

body {
  font-family: ${typo.fliessFont};
  font-size: ${typo.grundGroesse}pt;
  line-height: ${typo.zeilenhoehe};
  color: ${farben.text};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ══ LAYOUTSTABILITÄT ══════════════════════════════════════════════════════
   Diese vier Gruppen sind der eigentliche Grund für den Renderer. Sie greifen
   nur im Paged-Media-Kontext (Druck / Paged.js), im normalen Screen-Rendering
   sind sie wirkungslos — deshalb läuft die Vorschau durch Paged.js. */

/* 1. Zusammengehörige Blöcke nie über einen Seitenumbruch zerreißen. */
.pos-zeile,
.summe,
.signatur,
.fusszeile,
.meta,
.empfaenger,
.hinweis {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* 2. Tabellenkopf auf Folgeseiten wiederholen (sonst steht die zweite Seite
      ohne Spaltenbeschriftung da). */
thead { display: table-header-group; }
tfoot { display: table-footer-group; }

/* 3. Eine Überschrift bleibt bei ihrem Absatz — nie als letzte Zeile einer
      Seite allein stehen lassen. */
h1, h2, h3, .pos-titel, .abschnitt-titel {
  break-after: avoid;
  page-break-after: avoid;
}

/* 4. Keine Einzelzeilen am Seitenrand (Schusterjungen/Hurenkinder). */
p, .pos-beschreibung, .schlusstext {
  orphans: 3;
  widows: 3;
}

.seitenumbruch { break-before: page; }

/* ── Kopfbereich ───────────────────────────────────────────────────────── */
.kopf {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10mm;
  ${logo.position === 'links' ? 'flex-direction: row-reverse;' : ''}
}

.kopf-titel {
  font-family: ${typo.ueberschriftFont};
  font-size: ${typo.titelGroesse}pt;
  font-weight: 700;
  line-height: 1.1;
  margin: 0;
  color: ${farben.akzent};
}

.logo {
  width: ${zahl(logo.breite)}mm;
  height: auto;
  flex: none;
  ${logo.anzeigen ? '' : 'display: none;'}
}

.absenderzeile {
  font-size: ${typo.kleinGroesse - 1}pt;
  color: ${farben.grau};
  margin-top: 2mm;
}

/* ── Empfänger + Metablock ─────────────────────────────────────────────── */
.adressblock {
  display: flex;
  justify-content: space-between;
  gap: 12mm;
  margin-top: 10mm;
}

.empfaenger { flex: 1 1 auto; }
.empfaenger-name { font-weight: 700; font-size: ${typo.grundGroesse + 1}pt; }
.empfaenger-zusatz { color: ${farben.grau}; font-size: ${typo.kleinGroesse}pt; }

.meta {
  flex: none;
  min-width: 62mm;
  font-size: ${typo.kleinGroesse}pt;
}
.meta-zeile { display: flex; justify-content: space-between; gap: 6mm; }
.meta-label { color: ${farben.grau}; }
.meta-wert { text-align: right; white-space: nowrap; }

.dokument-nummer {
  font-weight: 700;
  font-size: ${typo.grundGroesse + 2}pt;
  margin-top: 8mm;
}

.anrede { margin-top: 8mm; }
.einleitung { margin-top: 2mm; white-space: pre-line; }

/* ── Positionstabelle ──────────────────────────────────────────────────── */
.positionen {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8mm;
  font-size: ${typo.kleinGroesse}pt;
}

.positionen th {
  text-align: left;
  font-weight: 700;
  font-size: ${typo.kleinGroesse - 0.5}pt;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 1.6mm 2mm;
  ${tabelle.kopfHintergrund ? `background: ${farben.tabellenKopfBg};` : ''}
  border-bottom: 0.4mm solid ${farben.akzent};
}

.positionen td {
  padding: 1.8mm 2mm;
  vertical-align: top;
  ${tabelle.zeilenTrennlinien ? `border-bottom: 0.2mm solid ${farben.linie};` : ''}
}

${tabelle.zebra ? `.pos-zeile:nth-child(even) td { background: ${farben.zebraBg}; }` : ''}

.col-pos         { width: ${spalten.pos}%; }
.col-beschreibung{ width: ${spalten.beschreibung}%; }
.col-menge       { width: ${spalten.menge}%; text-align: right; }
.col-ep          { width: ${spalten.einzelpreis}%; text-align: right; }
.col-gesamt      { width: ${spalten.gesamt}%; text-align: right; }

.pos-titel { font-weight: 500; }
.pos-artnr { color: ${farben.grau}; font-size: ${typo.kleinGroesse - 1}pt; }
.pos-beschreibung {
  color: ${farben.grau};
  margin-top: 0.8mm;
  white-space: pre-line;
}

/* Zahlen untereinander bündig — verhindert das optische Zittern in der
   Betragsspalte bei unterschiedlich langen Beträgen. */
.col-menge, .col-ep, .col-gesamt { font-variant-numeric: tabular-nums; }

/* ── Summe ─────────────────────────────────────────────────────────────── */
.summe {
  margin-top: 6mm;
  margin-left: auto;
  width: ${spalten.menge + spalten.einzelpreis + spalten.gesamt + 14}%;
  border-top: 0.4mm solid ${farben.akzent};
  padding-top: 3mm;
}
.summe-zeile {
  display: flex;
  justify-content: space-between;
  gap: 6mm;
  font-size: ${typo.kleinGroesse}pt;
  padding: 0.6mm 0;
}
.summe-zeile.stark {
  font-weight: 700;
  font-size: ${typo.grundGroesse}pt;
}
.summe-wert { font-variant-numeric: tabular-nums; white-space: nowrap; }

/* ── Hinweise, Schlusstext, Signatur ───────────────────────────────────── */
.hinweise { margin-top: 6mm; font-size: ${typo.kleinGroesse}pt; }
.hinweis { margin: 0 0 1.5mm 0; }

.schlusstext { margin-top: 6mm; white-space: pre-line; }

.signatur {
  margin-top: 10mm;
  ${bloecke.signatur ? '' : 'display: none;'}
}
.signatur-gruss { margin-bottom: 8mm; }
.signatur-name { font-weight: 500; }

/* ── Fußzeile ──────────────────────────────────────────────────────────────
   Bewusst IM FLUSS am Dokumentende statt "position: fixed".

   Hintergrund: Chrome wiederholt fixierte Elemente im Druck auf jeder Seite,
   Paged.js kann das nicht — die Fußzeile stünde in der Vorschau woanders als
   im PDF. Genau die Art Divergenz, die dieser Renderer ausschließen soll.
   Im Fluss verhalten sich beide Engines identisch, und es entspricht dem
   bisherigen Verhalten der pdf-lib-Vorlage (Fußzeile nur auf der letzten
   Seite). Die Seitenzahl läuft getrennt darüber — sie ist ein kurzer String
   und wird von beiden Engines über ihren eigenen Mechanismus gesetzt. */
.fusszeile {
  display: ${bloecke.fusszeile ? 'flex' : 'none'};
  gap: 6mm;
  margin-top: 10mm;
  padding-top: 2mm;
  border-top: 0.2mm solid ${farben.linie};
  font-size: ${typo.kleinGroesse - 1}pt;
  line-height: 1.4;
  color: ${farben.grau};
}
.fusszeile-spalte { flex: 1 1 0; }
.fusszeile-titel { font-weight: 700; color: ${farben.text}; }

/* ── Entwurfs-Kennzeichnung ────────────────────────────────────────────────
   Als Badge neben dem Titel statt als gedrehtes Wasserzeichen — ein
   Wasserzeichen bräuchte wieder "position: fixed" und hätte dasselbe
   Vorschau/PDF-Problem wie die Fußzeile. */
.entwurf-badge {
  display: inline-block;
  margin-top: 2mm;
  padding: 1mm 2.5mm;
  border: 0.3mm solid ${farben.grau};
  border-radius: 1mm;
  font-size: ${typo.kleinGroesse - 1}pt;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${farben.grau};
}

/* ── Nur Bildschirm: A4-Blatt-Optik in der Vorschau ────────────────────────
   Paged.js erzeugt .pagedjs_page-Container. Die bekommen hier Schatten und
   Abstand, damit man Seitengrenzen sieht. Im PDF existiert das nicht. */
@media screen {
  body { background: #f4f4f5; }
  .pagedjs_pages { display: flex; flex-direction: column; align-items: center; gap: 8mm; padding: 8mm 0; }
  .pagedjs_page {
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,.12), 0 8px 24px rgba(0,0,0,.08);
    border-radius: 2px;
  }
}
`.trim()
}
