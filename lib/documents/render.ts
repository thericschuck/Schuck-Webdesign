import type { DocumentData, DocumentTheme, RenderMode } from './types'
import { buildCss } from './css'
import { LOGO_DATA_URI } from './assets.generated'
import { escapeHtml, fmtEuro, fmtMenge } from './format'

/**
 * DER Renderer. Eine reine Funktion `(daten, theme) → HTML-String`.
 *
 * Hart eingehalten: dieses Modul importiert nichts aus `node:*`, kein Supabase,
 * kein React. Genau deshalb kann derselbe Code beides bedienen —
 *   * Browser: `<iframe srcdoc={renderDocument(...)}>` für die Live-Vorschau
 *   * Node:    `page.setContent(renderDocument(...))` für das PDF
 * Es gibt also kein zweites System, das auseinanderlaufen könnte.
 *
 * Der einzige Unterschied zwischen beiden Pfaden ist `mode`: In `preview` wird
 * das Paged.js-Polyfill eingebunden, damit der Browser die Paged-Media-Regeln
 * (Seitenumbrüche, `break-inside: avoid`) überhaupt anwendet. Am Inhalt und am
 * CSS ändert sich dadurch nichts.
 */
/** Kanal, über den das Vorschau-iframe seine Maße an die App meldet. */
export const PREVIEW_MESSAGE_TYPE = 'schuck-document-preview'

/**
 * Läuft nur im Vorschau-iframe. Meldet Höhe und Seitenzahl an die Elternseite,
 * sobald Paged.js fertig paginiert hat.
 *
 * Nötig, weil das iframe als `sandbox="allow-scripts"` ohne `allow-same-origin`
 * läuft — die Elternseite kommt also nicht an `contentDocument` heran und kann
 * die Höhe nicht selbst messen. postMessage ist der einzige erlaubte Weg und
 * gleichzeitig der sicherere: das Dokument bleibt in einem eigenen Origin.
 */
const PREVIEW_REPORTER_JS = `
(function () {
  var vorherigerSchluessel = null;
  var gemeldet = null;

  function melden() {
    var seiten = document.querySelectorAll('.pagedjs_page').length;
    // Vor der Pagination ist scrollHeight der Endlos-Flow — erst melden, wenn
    // Paged.js mindestens eine Seite erzeugt hat, sonst springt die Höhe.
    if (seiten === 0) return;

    var hoehe = document.body.scrollHeight;
    var schluessel = seiten + ':' + hoehe;

    // Paged.js hängt die Seiten nacheinander an. Würde jeder Zwischenstand
    // gemeldet, flackerte die Vorschau beim Aufbau ("1 Seite" ... "2 Seiten")
    // und die Höhe spränge. Deshalb erst melden, wenn sich zwei Messungen in
    // Folge decken — dann ist die Pagination durch.
    if (schluessel === vorherigerSchluessel && schluessel !== gemeldet) {
      gemeldet = schluessel;
      parent.postMessage({ type: '${PREVIEW_MESSAGE_TYPE}', hoehe: hoehe, seiten: seiten }, '*');
    }
    vorherigerSchluessel = schluessel;
  }

  var timer = setInterval(melden, 150);
  setTimeout(function () { clearInterval(timer); }, 15000);
})();
`.trim()

export function renderDocument(
  data: DocumentData,
  theme: DocumentTheme,
  mode: RenderMode = 'print'
): string {
  const css = buildCss(theme)

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light">
<title>${escapeHtml(dokumentTitel(data))}</title>
<style>${css}</style>
${mode === 'preview' ? `<script src="/vendor/paged.polyfill.js"></script>\n<script>${PREVIEW_REPORTER_JS}</script>` : ''}
</head>
<body>
${blockKopf(data, theme)}
${blockAdresse(data)}
${blockBetreff(data)}
${blockAnrede(data)}
${blockPositionen(data)}
${blockSumme(data)}
${blockHinweise(data)}
${blockSchlusstext(data)}
${blockSignatur(data)}
${blockFusszeile(data, theme)}
</body>
</html>`
}

/** Dateiname/Titel des Dokuments, z.B. "Rechnung RE-2026-001". */
export function dokumentTitel(data: DocumentData): string {
  return data.nummer ? `${data.titel} ${data.nummer}` : `${data.titel} (Entwurf)`
}

/**
 * Seitenzahl-Fußzeile für Puppeteers `footerTemplate`.
 *
 * Das ist die einzige Stelle, an der Vorschau und PDF technisch verschiedene
 * Mechanismen benutzen: Chrome unterstützt keine `@page`-Margin-Boxen, Paged.js
 * schon. Damit trotzdem exakt derselbe Text mit denselben Werten erscheint,
 * kommen beide aus diesem einen Theme — die Margin-Box-Variante steht in
 * `buildCss()`, die Puppeteer-Variante hier.
 *
 * Achtung: Chrome rendert `footerTemplate` per Default mit `font-size: 0`.
 * Größe und Farbe müssen deshalb inline gesetzt werden, `<style>`-Blöcke und
 * die Schriften des Dokuments greifen hier nicht.
 */
export function buildSeitenzahlFooterHtml(theme: DocumentTheme): string {
  const size = theme.typo.kleinGroesse - 1
  return `<div style="width:100%;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:${size}pt;color:${theme.farben.grau};padding:0 ${theme.seite.randRechts}mm 8mm 0;text-align:right;">
  Seite <span class="pageNumber"></span> von <span class="totalPages"></span>
</div>`
}

// ════════════════════════════════════════════════════════════════════════════
// Blöcke
// ════════════════════════════════════════════════════════════════════════════

/** Logo + Dokumenttitel + einzeilige Absenderzeile über dem Adressfenster. */
function blockKopf(data: DocumentData, theme: DocumentTheme): string {
  const a = data.absender
  const absenderzeile = [a.firma, a.strasse, [a.plz, a.ort].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' · ')

  return `<header class="kopf">
  <div>
    <h1 class="kopf-titel">${escapeHtml(data.titel)}</h1>
    <div class="absenderzeile">${escapeHtml(absenderzeile)}</div>
    ${data.entwurf ? '<div class="entwurf-badge">Entwurf</div>' : ''}
  </div>
  ${theme.logo.anzeigen ? `<img class="logo" src="${LOGO_DATA_URI}" alt="${escapeHtml(a.firma)}">` : ''}
</header>`
}

/** Empfängeranschrift links, Metablock (Datumsangaben, Nummern) rechts. */
function blockAdresse(data: DocumentData): string {
  const e = data.empfaenger
  const zeilen = [
    e.zusatz ? `<div class="empfaenger-zusatz">${escapeHtml(e.zusatz)}</div>` : '',
    e.strasse ? `<div>${escapeHtml(e.strasse)}</div>` : '',
    [e.plz, e.ort].filter(Boolean).length
      ? `<div>${escapeHtml([e.plz, e.ort].filter(Boolean).join(' '))}</div>`
      : '',
    // Land nur zeigen, wenn es vom Standard abweicht — sonst steht auf jeder
    // Inlandsrechnung überflüssig "Deutschland".
    e.land && e.land !== 'Deutschland' ? `<div>${escapeHtml(e.land)}</div>` : '',
  ].join('\n    ')

  const meta = data.meta
    .map(
      (row) => `<div class="meta-zeile">
      <span class="meta-label">${escapeHtml(row.label)}</span>
      <span class="meta-wert">${escapeHtml(row.value)}</span>
    </div>`
    )
    .join('\n    ')

  return `<section class="adressblock">
  <div class="empfaenger">
    <div class="empfaenger-name">${escapeHtml(e.name)}</div>
    ${zeilen}
  </div>
  <div class="meta">
    ${meta}
  </div>
</section>`
}

/** "Rechnung Nr. RE-2026-001" in voller Breite. */
function blockBetreff(data: DocumentData): string {
  if (!data.nummer) return ''
  return `<div class="dokument-nummer">${escapeHtml(data.titel)} Nr. ${escapeHtml(data.nummer)}</div>`
}

function blockAnrede(data: DocumentData): string {
  const teile = [
    data.anrede ? `<div class="anrede">${escapeHtml(data.anrede)}</div>` : '',
    data.einleitungstext ? `<div class="einleitung">${escapeHtml(data.einleitungstext)}</div>` : '',
  ].filter(Boolean)
  return teile.join('\n')
}

/**
 * Leistungstabelle. Jede `<tr>` trägt `break-inside: avoid` (siehe css.ts) —
 * eine Position mit langer Beschreibung wandert also komplett auf die nächste
 * Seite, statt in der Mitte zerschnitten zu werden. Der `<thead>` wiederholt
 * sich dank `display: table-header-group` auf Folgeseiten.
 */
function blockPositionen(data: DocumentData): string {
  const zeilen = data.positionen
    .map((p) => {
      const beschreibung = p.beschreibung?.trim()
      const artNr = p.artNr?.trim()
      return `  <tr class="pos-zeile">
    <td class="col-pos">${p.pos}</td>
    <td class="col-beschreibung">
      <div class="pos-titel">${escapeHtml(p.titel)}</div>
      ${artNr ? `<div class="pos-artnr">${escapeHtml(artNr)}</div>` : ''}
      ${beschreibung ? `<div class="pos-beschreibung">${escapeHtml(beschreibung)}</div>` : ''}
    </td>
    <td class="col-menge">${escapeHtml(fmtMenge(p.menge))}</td>
    <td class="col-ep">${escapeHtml(p.einzelpreisLabel ?? fmtEuro(p.einzelpreis))}</td>
    <td class="col-gesamt">${escapeHtml(p.betragLabel ?? fmtEuro(p.gesamt))}</td>
  </tr>`
    })
    .join('\n')

  return `<table class="positionen">
  <thead>
    <tr>
      <th class="col-pos">Pos</th>
      <th class="col-beschreibung">Beschreibung</th>
      <th class="col-menge">Menge</th>
      <th class="col-ep">Einzelpreis</th>
      <th class="col-gesamt">Gesamt</th>
    </tr>
  </thead>
  <tbody>
${zeilen}
  </tbody>
</table>`
}

function blockSumme(data: DocumentData): string {
  const s = data.summe
  const zeilen: string[] = []

  if (s.ustPflichtig && s.ustBetrag != null && s.brutto != null) {
    zeilen.push(summenZeile('Gesamtbetrag netto', fmtEuro(s.netto)))
    zeilen.push(summenZeile(`zzgl. ${s.ustSatz ?? 19} % USt.`, fmtEuro(s.ustBetrag)))
    zeilen.push(summenZeile('Gesamtbetrag brutto', fmtEuro(s.brutto), true))
  } else {
    zeilen.push(summenZeile('Gesamtbetrag', fmtEuro(s.netto), true))
  }

  return `<section class="summe">
${zeilen.join('\n')}
</section>`
}

function summenZeile(label: string, wert: string, stark = false): string {
  return `  <div class="summe-zeile${stark ? ' stark' : ''}">
    <span>${escapeHtml(label)}</span>
    <span class="summe-wert">${escapeHtml(wert)}</span>
  </div>`
}

function blockHinweise(data: DocumentData): string {
  if (data.hinweise.length === 0) return ''
  return `<section class="hinweise">
${data.hinweise.map((h) => `  <p class="hinweis">${escapeHtml(h)}</p>`).join('\n')}
</section>`
}

function blockSchlusstext(data: DocumentData): string {
  if (!data.schlusstext?.trim()) return ''
  return `<section class="schlusstext">${escapeHtml(data.schlusstext)}</section>`
}

function blockSignatur(data: DocumentData): string {
  if (!data.grussformel && !data.unterschrift) return ''
  return `<section class="signatur">
  ${data.grussformel ? `<div class="signatur-gruss">${escapeHtml(data.grussformel)}</div>` : ''}
  ${data.unterschrift ? `<div class="signatur-name">${escapeHtml(data.unterschrift)}</div>` : ''}
</section>`
}

/**
 * Dreispaltige Fußzeile (Absender / Kontakt / Bank). Liegt per `position: fixed`
 * am unteren Seitenrand und wird von Chrome im Druck auf jeder Seite wiederholt.
 */
function blockFusszeile(data: DocumentData, theme: DocumentTheme): string {
  if (!theme.bloecke.fusszeile) return ''
  const a = data.absender

  const spalte = (titel: string, zeilen: (string | null | undefined)[]) => {
    const inhalt = zeilen
      .filter((z): z is string => Boolean(z && z.trim()))
      .map((z) => `    <div>${escapeHtml(z)}</div>`)
      .join('\n')
    return `  <div class="fusszeile-spalte">
    <div class="fusszeile-titel">${escapeHtml(titel)}</div>
${inhalt}
  </div>`
  }

  const spalten = [
    spalte(a.firma, [
      a.strasse,
      [a.plz, a.ort].filter(Boolean).join(' '),
      a.land,
      a.steuernummer ? `Steuer-Nr. ${a.steuernummer}` : null,
      a.ustId ? `USt-IdNr. ${a.ustId}` : null,
    ]),
    spalte('Kontakt', [
      a.inhaber,
      a.telefon ? `Tel. ${a.telefon}` : null,
      a.email ? `Mail: ${a.email}` : null,
      a.website,
    ]),
  ]

  if (theme.bloecke.bankdaten) {
    spalten.push(
      spalte('Bankverbindung', [
        a.inhaber,
        a.bankName,
        a.iban ? `IBAN: ${a.iban}` : null,
        a.bic ? `BIC: ${a.bic}` : null,
      ])
    )
  }

  return `<footer class="fusszeile">
${spalten.join('\n')}
</footer>`
}
