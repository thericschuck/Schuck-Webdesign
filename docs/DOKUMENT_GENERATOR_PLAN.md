# Plan – Angebots-/Rechnungs-Generator mit Live-Vorschau

Stand: 2026-08-29 · Ziel: ein Renderer für Vorschau **und** PDF, Layout in der Admin-UI anpassbar,
Angebote/Rechnungen dynamisch aus den bestehenden Daten befüllt.

---

## 1. Bewertung des Ausgangs-Prompts

### Was daran richtig ist

- **„Genau eine Render-Funktion für Vorschau und PDF"** — das ist das tragende Prinzip. Genau so bauen.
- **`break-inside: avoid` auf zusammengehörigen Blöcken** — die richtige Antwort auf das Word-Problem.
- **Positions-Datenmodell mit `einzelpreisLabel` / `betragLabel` / `excludeFromSum`** — pragmatisch und deckt
  reale Fälle ab (Care-Position „25 € p.M." mit „–" als Betrag).
- **Stresstest mit langen Namen / mehrseitigem Schlusstext** — genau die richtige Verifikationsmethode.

### Was nicht passt

| # | Problem | Konsequenz |
|---|---------|-----------|
| 1 | **Separates Express-Tool neben der bestehenden Next.js-App.** Diese App hat bereits `invoices`, `invoice_items`, `offers`, `offer_items`, `articles`, `packages`, `company_settings`, GoBD-Nummernkreise (`issue_invoice()`, `create_credit_note()`), Storage-Bucket `invoices` und Resend-Versand. | Ein Nebentool dupliziert das alles und **umgeht die GoBD-Sicherungen**: Rechnungen aus dem Nebentool haben keine lückenlose Nummer, keinen Unveränderlichkeits-Trigger und tauchen nicht im Umsatz-Dashboard auf. Steuerlich riskant, nicht nur unschön. |
| 2 | **Live-Vorschau per HTTP-Roundtrip an `/api/render` mit 300 ms Debounce.** | Unnötig. `renderDocument(data)` ist eine reine Funktion HTML aus Daten — ohne Node-APIs. Die läuft direkt im Browser. Ergebnis: Vorschau **ohne Latenz**, und das „eine Funktion"-Prinzip wird sogar stärker, nicht schwächer. |
| 3 | **Die Vorschau ist nicht seitengenau.** Ein iframe mit dem HTML zeigt einen endlosen Scroll-Flow, keine A4-Seiten mit echten Umbrüchen. | Genau das war das Word-Problem: man sieht nicht, wo umgebrochen wird. `break-inside: avoid` greift im normalen Screen-Rendering gar nicht — es ist eine Paged-Media-Eigenschaft. **Die Vorschau prüft also genau das nicht, was abgesichert werden soll.** |
| 4 | **Puppeteer-Deployment ist nicht adressiert.** | Auf Vercel läuft `puppeteer` nicht out of the box. Braucht `puppeteer-core` + `@sparticuz/chromium`, `serverExternalPackages`, `maxDuration`, und **Fonts müssen eingebettet werden** — Lambda hat keine System-Fonts, Playfair/DM Sans würden auf Helvetica zurückfallen. |
| 5 | **„Layout anpassbar" fehlt komplett.** Der Prompt beschreibt festes CSS im Code (`SHARED_CSS`). | Die Anforderung „ich möchte das Layout anpassen können" ist damit nicht erfüllt. Braucht ein Theme-Objekt, aus dem das CSS abgeleitet wird. |
| 6 | **Restliche Umbruch-Ursachen fehlen im CSS.** | `break-inside: avoid` allein reicht nicht — siehe CSS-Kern in Abschnitt 4.2 (`orphans`/`widows`, `break-after: avoid` auf Überschriften, `display: table-header-group`). |
| 7 | **E-Rechnung (Deutschland) kommt nicht vor.** | Siehe Abschnitt 3.3 — für dich aktuell entspannt, aber die Architekturentscheidung dafür muss jetzt fallen, nicht später. |
| 8 | **Datenmodell kollidiert mit dem DB-Schema.** `invoice_items` hat nur `art_nr, pos, bezeichnung, menge, ep, gesamt`. Kein `beschreibung`, kein `exclude_from_sum`, keine Label-Overrides. | Braucht eine Migration (Abschnitt 5). |

**Fazit:** Das Prinzip stimmt, die Verpackung nicht. Der Renderer gehört als Modul in diese App, nicht in einen zweiten Server.

---

## 2. Ist-Zustand (was schon da ist)

| Baustein | Ort | Zustand |
|----------|-----|---------|
| Rechnungs-PDF | `lib/pdf/invoice.ts` (241 Z.) | pdf-lib, Koordinaten von Hand (`y -= 14`). Funktioniert, aber jede Layoutänderung ist Rechenarbeit. |
| Angebots-PDF | `lib/pdf/templates/angebot.ts` (177 Z.) | dito, Layout dupliziert |
| Vertrag / Briefing / Übergabe / Care-Report | `lib/pdf/templates/*.ts` (618 Z.) | dito, Layout ein drittes bis sechstes Mal dupliziert |
| Vorschau | `/api/admin/finanzen/rechnungen/[id]/preview-pdf` | erzeugt ein volles PDF pro Aufruf, kein Live-Update |
| Domain | `lib/domain/finance.ts` (886 Z.), `lib/domain/documents.ts` | vollständig: Entwürfe, Nummernkreise, Versand, Gutschriften, Mahnungen |
| Katalog | `articles` / `packages` / `package_items` | **schon in der DB** — der „nächste Schritt Produktkatalog" aus dem Prompt ist zu 80 % erledigt |
| Positions-Editor | `app/(admin)/admin/finanzen/rechnungen/ItemsEditor.tsx` | durchsuchbare Artikel-/Paket-Auswahl, wiederverwendbar |
| Nummernkreise | Postgres `issue_invoice()`, `create_credit_note()`, `get_next_number()` | GoBD-fest, `security definer`, nur `service_role` |
| Versand | `lib/domain/finance.ts#sendInvoice` via Resend | vorhanden — für **Rechnungen**. Angebote separat in `akquise.ts`. |

### Konkrete Lücken im Ist-Zustand

- **Layout ist 6× dupliziert** über `lib/pdf/**` — eine Änderung am Briefkopf heißt sechs Dateien.
- **Angebote nur aus Leads erstellbar.** `createOfferAction(leadId)` ist an einen Lead gebunden — für einen
  bestehenden Kunden lässt sich kein Angebot anlegen.
- **Angebote liegen in Akquise, Rechnungen in Finanzen.** Zwei Orte für dasselbe Dokument-Konzept.
- **„Rechnung nachtragen"** ist ein grauer Textlink neben dem Primärbutton — funktional wichtig, visuell versteckt.
- **Vorlagen sind nirgends sichtbar.** Die Layouts existieren nur als Code.

---

## 3. Recherche-Ergebnisse

### 3.1 Rendering-Optionen

| Ansatz | Layouttreue | Preview = PDF? | Vercel | Urteil |
|--------|-------------|----------------|--------|--------|
| **pdf-lib** (Ist-Zustand) | manuell | nein (PDF-Roundtrip) | ✅ trivial | Layoutänderungen sind Koordinatenrechnen. Bleibt als **Fallback**. |
| **Puppeteer + Headless Chrome** | volles CSS inkl. Paged Media | ✅ identische Engine | ⚠️ Setup nötig, jetzt aber gelöst | **Empfehlung.** |
| `@react-pdf/renderer` | eigener Flexbox-Layouter, CSS-Subset | ✅ (eigener Viewer) | ✅ leicht | Kein echtes CSS. Du müsstest die Vorlage neu erfinden statt sie zu übernehmen. Verworfen. |
| Gotenberg / Browserless / PDFShift (extern) | Chrome | ✅ | ✅ | Zusätzliche Infra + Kosten + Kundendaten gehen an Dritte. Nur als Notausgang. |
| Typst / LaTeX | sehr hoch | ✗ (kein HTML-Preview) | ✗ | Zweite Sprache, zweites Layout. Verworfen. |
| `window.print()` im Browser | Chrome | ✅ | ✅ | Kein serverseitiges PDF → kein Mailversand, kein Storage. Nicht ausreichend. |

**Entscheidung: Puppeteer.** Weil du deine bestehenden Word-Vorlagen 1:1 als HTML/CSS nachbauen und dann
per Variable befüllen willst — und weil Vorschau und PDF dieselbe Rendering-Engine benutzen sollen.

### 3.2 Vercel-Fakten (Stand 2026-08-24, aus den Vercel-Docs)

- Bundle-Limit: **250 MB** unkomprimiert — **oder 5 GB** mit *Large Functions* (Beta).
  Voraussetzung: Fluid Compute + Active CPU. Für bestehende Projekte per Env-Var
  `VERCEL_SUPPORT_LARGE_FUNCTIONS=1` aktivierbar. → **Das volle `@sparticuz/chromium` passt jetzt**,
  die `-min`-Variante mit Remote-Download ist nicht mehr nötig.
- Max Duration: Hobby **300 s** (früher 10 s). Ein PDF-Render braucht ~2–5 s warm, ~10–15 s kalt. Unkritisch.
- Aktuelle Version: `@sparticuz/chromium@149.0.0`, `engines: node ^22.17.0 || >=24`.
- Response-Body-Limit **4,5 MB** — ein Rechnungs-PDF liegt bei 50–300 KB. Unkritisch.

### 3.3 E-Rechnung Deutschland — jetzt entscheiden, später bauen

- Seit **1.1.2025**: Empfangspflicht für inländische B2B-Rechnungen (gilt auch für dich).
- **§19-Kleinunternehmer sind von der *Ausstellungs*pflicht dauerhaft befreit.** `company_settings.ust_pflichtig`
  steht auf `false` → aktuell keine Pflicht.
- Falls `ust_pflichtig` irgendwann `true` wird: Pflicht ab **1.1.2028** (bzw. 1.1.2027 bei >800 k € Umsatz 2026).
- Passendes Format: **ZUGFeRD** = PDF/A-3 mit eingebettetem CII-XML. Das PDF bleibt für Menschen lesbar,
  das Layout bleibt deins.
- **Architektur-relevant:** Chrome erzeugt kein PDF/A-3. Der ZUGFeRD-Schritt ist eine **Nachbearbeitung des
  fertigen PDFs** — XML als Embedded File + XMP-Metadaten anhängen. Das geht mit **pdf-lib, das ohnehin schon
  im Stack ist**. Also: Puppeteer erzeugt das PDF, pdf-lib veredelt es optional. Kein Konflikt, keine
  Neuentscheidung nötig — nur eine spätere Phase.

---

## 4. Zielarchitektur

### 4.1 Der isomorphe Renderer

```
lib/documents/
  types.ts               → DocumentData + DocumentTheme
  theme.ts               → DEFAULT_THEME + mergeTheme() für DB-Overrides
  css.ts                 → buildCss(theme): string   — CSS wird AUS dem Theme abgeleitet
  assets.generated.ts    → Playfair + DM Sans (Variable, latin) und Logo als Data-URI
  format.ts              → escapeHtml, fmtEuro, fmtDate, addDays
  render.ts              → renderDocument(data, theme, mode): string + alle Blockfunktionen
  sample.ts              → Stresstest-Beispieldaten
  from-db.ts             → documentFromInvoice() / documentFromOffer()
  pdf.ts                 → renderHtmlToPdf() via Puppeteer (server-only)
```

Abweichung vom ursprünglichen Entwurf: die Blöcke liegen als Funktionen in `render.ts` statt in einem
eigenen `blocks/`-Ordner. Bei acht kurzen Funktionen ist eine durchsuchbare Datei beim Layoutanpassen
schneller als acht Dateien.

Die Fonts sind **Variable Fonts** — pro Familie reicht eine woff2-Datei für 400–700. Zusammen mit dem
Logo sind das 104 KB eingebettet statt fünf Einzelschnitte.

**Harte Regel: `lib/documents/**` importiert nichts aus `node:*`, kein Supabase, kein React.**
Reine Funktionen `(data, theme) → string`. Dadurch läuft exakt derselbe Code:

- im **Browser** → `<iframe srcdoc={renderDocument(...)}>` für die Live-Vorschau, ohne Netzwerk
- in **Node** → `page.setContent(renderDocument(...))` für das PDF

Das ist das Prinzip aus deinem Prompt, nur ohne den `/api/render`-Roundtrip: die Vorschau kann nicht
divergieren, weil sie denselben String rendert — und sie ist sofort da statt nach 300 ms.

### 4.2 CSS-Kern für Layoutstabilität

```css
@page { size: A4; margin: 18mm 16mm 22mm 16mm; }

/* zusammengehörige Blöcke nie zerreißen */
.pos-row, .summe, .signatur, .stempel, .bankdaten { break-inside: avoid; }

/* Tabellenkopf wiederholt sich auf Folgeseiten (fehlte im Prompt) */
thead { display: table-header-group; }
tfoot { display: table-footer-group; }

/* Überschrift bleibt bei ihrem Absatz (fehlte im Prompt) */
h2, h3, .pos-titel { break-after: avoid; }

/* keine Einzelzeilen am Seitenrand (fehlte im Prompt) */
p, .pos-beschreibung { orphans: 3; widows: 3; }

.seitenumbruch { break-before: page; }
```

Die drei mit „fehlte im Prompt" markierten Regeln sind genau die verbleibenden Ursachen für
verrutschende Layouts, wenn `break-inside: avoid` allein gesetzt ist.

### 4.3 Seitengenaue Live-Vorschau

`break-inside`, `orphans`, `@page` sind **Paged-Media-Eigenschaften** — im normalen Browser-Rendering
wirkungslos. Eine iframe-Vorschau des rohen HTML zeigt sie also nicht.

**Lösung: [Paged.js](https://pagedjs.org) im Vorschau-iframe.** Polyfillt CSS Paged Media und Generated
Content, paginiert das HTML im Browser zu echten A4-Seiten mit denselben Fragmentierungsregeln.
Ergebnis: du siehst live, wo umgebrochen wird, ohne PDF-Roundtrip.

Zweistufig:
1. **Sofort-Vorschau** (jeder Tastendruck): Paged.js, seitengenau.
2. **Exakt-Vorschau** (Button „PDF prüfen"): echtes Puppeteer-PDF, inline im iframe.

Stufe 1 ist für 99 % der Arbeit richtig, Stufe 2 vor dem Rausschicken.

**Nachgemessen (`scripts/verify-preview-iframe.ts`):** Das Vorschau-iframe braucht
`sandbox="allow-scripts allow-same-origin"`. Ohne `allow-same-origin` lädt Paged.js zwar, übernimmt
den Inhalt und **bleibt dann still stehen** — 0 Seiten, leerer Body, keine Fehlermeldung. Damit ist
die iframe-Isolation faktisch aufgehoben. Gegenmaßnahmen im Renderer: alle Daten laufen durch
`escapeHtml()`, alle Theme-Werte durch `cssWert()` bzw. `Number()` — ein Theme-Wert wie
`rot</style><script>…` kann also nicht aus dem `<style>`-Block ausbrechen, sobald Themes ab
Phase 7 aus der DB kommen.

### 4.4 Der eine Divergenzpunkt: Fußzeile mit Seitenzahl

Chrome unterstützt keine `@page`-Margin-Boxen (`@bottom-center { content: counter(page) }`), Paged.js schon.
Puppeteer bietet stattdessen `displayHeaderFooter` + `footerTemplate`.

**Aufgeteilt in zwei Fälle — Ergebnis der Umsetzung:**

- **Adressblock-Fußzeile** (Firma / Kontakt / Bank, dreispaltig): läuft **im Dokumentfluss** am Ende,
  nicht als `position: fixed`. Ursprünglich war `fixed` geplant, weil Chrome solche Elemente im Druck
  auf jeder Seite wiederholt — Paged.js kann das aber nicht, die Fußzeile stünde in der Vorschau
  woanders als im PDF. Im Fluss verhalten sich beide Engines identisch, und es entspricht dem
  bisherigen Verhalten der pdf-lib-Vorlage (Fußzeile nur auf der letzten Seite). Aus demselben Grund
  ist das Entwurfs-Wasserzeichen ein Badge neben dem Titel statt eines gedrehten `fixed`-Elements.
- **Seitenzahl** („Seite 1 von 2"): bleibt der einzige Punkt mit zwei Mechanismen — `@page`-Margin-Box
  in `buildCss()` für Paged.js, `buildSeitenzahlFooterHtml(theme)` für Puppeteers `footerTemplate`.
  Beide lesen dieselben Theme-Werte. Ein kurzer String, deshalb vertretbar.
  (Achtung: Chrome rendert `footerTemplate` per Default mit `font-size: 0` — Größe muss inline stehen.)

### 4.5 PDF-Route

```ts
// app/api/admin/documents/pdf/route.ts
export const runtime = 'nodejs'
export const maxDuration = 60
```

```ts
// next.config.ts
serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium']
```

- Prod: `puppeteer-core` + `@sparticuz/chromium@149`, `executablePath: await chromium.executablePath()`
- Lokal: lokal installiertes Chrome über `channel: 'chrome'` (kein 150-MB-Download im Repo)
- `page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })`
- Fonts kommen als base64-`@font-face` aus dem HTML → **keine Abhängigkeit von System-Fonts in Lambda**
- Env: `VERCEL_SUPPORT_LARGE_FUNCTIONS=1` setzen

**pdf-lib bleibt bis auf Weiteres als Fallback stehen.** Feature-Flag `DOCUMENT_RENDERER=puppeteer|pdf-lib`.
Erst wenn Puppeteer in Produktion sauber läuft, wird `lib/pdf/**` entfernt.

### 4.6 Wie eine Vorlage geändert wird

Drei Ebenen, von „jederzeit" bis „einmalig":

| Was | Wo | Deploy nötig? |
|-----|-----|---------------|
| Ränder, Farben, Schriftgrößen, Spaltenbreiten, Logo-Größe/-Position, Blöcke an/aus | `DEFAULT_THEME` in `lib/documents/theme.ts` — ab Phase 7 über den Vorlagen-Editor in der UI | heute ja, ab Phase 7 nein |
| Struktur: welcher Block wo steht, welche Felder auftauchen | Blockfunktionen in `lib/documents/render.ts` | ja |
| Neues Layout aus einer Word-Vorlage | Word-Vorlage → PDF exportieren → als Referenz danebenlegen → `render.ts` + `theme.ts` daran anpassen | ja |

**Wichtig zur Word-Frage:** Eine `.docx`/PDF-Datei lässt sich **nicht automatisch** in dieses System
importieren — Word-Layouts bestehen aus absolut positionierten Rahmen und Tabulatoren, die sich nicht
verlustfrei in HTML/CSS übersetzen lassen (genau das war ja die Ursache des Verrutschens). Der Weg ist:
Du baust die Vorlage in Word so, wie sie aussehen soll, exportierst sie als PDF, und die wird als
Vorbild in `render.ts`/`theme.ts` nachgebaut. Danach ist sie beliebig oft dynamisch befüllbar — der
Nachbau passiert **einmal pro Vorlage**, nicht pro Dokument.

Der Aufwand pro Vorlage ist überschaubar, weil Kopf, Adressblock, Positionstabelle, Summe, Hinweise,
Signatur und Fußzeile bereits als eigene Blöcke existieren. Ein neues Layout heißt in der Regel:
Theme-Werte anpassen plus ein bis zwei Blöcke umbauen.

---

## 5. Datenmodell-Änderungen (Migration `0036_document_renderer.sql`)

```sql
-- Positionen: mehrzeilige Beschreibung + Label-Overrides + Summen-Ausschluss
alter table public.invoice_items add column if not exists beschreibung      text;
alter table public.invoice_items add column if not exists ep_label          text;
alter table public.invoice_items add column if not exists betrag_label      text;
alter table public.invoice_items add column if not exists exclude_from_sum  boolean not null default false;
-- identisch für public.offer_items

-- Dokument-Themes (Layout in der UI anpassbar)
create table if not exists public.document_themes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null check (kind in ('angebot','rechnung','gutschrift','universal')),
  tokens      jsonb not null default '{}'::jsonb,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- + RLS-Policy "Admin verwaltet alle", + partieller Unique-Index auf (kind) where is_default

-- Freitextblöcke pro Dokument
alter table public.invoices add column if not exists einleitungstext text;
alter table public.invoices add column if not exists schlusstext     text;
alter table public.offers   add column if not exists einleitungstext text;
alter table public.offers   add column if not exists schlusstext     text;
```

**Zu beachten:**
- Der Unveränderlichkeits-Trigger auf `invoices`/`invoice_items` bleibt unberührt — neue Spalten
  ändern nichts an der GoBD-Logik. Aber: `enforce_invoice_immutability()` listet die geschützten Felder
  **explizit auf**. `schlusstext` müsste bei gestellten Rechnungen ebenfalls gesperrt werden → Trigger erweitern.
- `resolveInvoiceItems()` in `lib/domain/finance.ts` muss `exclude_from_sum`-Zeilen aus `total_net` herausrechnen.
- **Themes werden pro Dokument eingefroren** (`invoices.theme_snapshot jsonb`) — sonst ändert eine spätere
  Layout-Anpassung rückwirkend das Aussehen einer bereits gestellten Rechnung. Das wäre ein GoBD-Problem,
  analog zum bereits eingefrorenen `ust_pflichtig`.

---

## 6. Navigation Finanzen — neu

**Ist:** `Dashboard · Rechnungen · Einstellungen` (Unterstrich-Tabs). Angebote liegen in Akquise.
„Rechnung nachtragen" ist ein grauer Textlink. Vorlagen gibt es in der UI nicht.

**Soll:**

```
/admin/finanzen
├── Übersicht      → Kennzahlen, Umsatzverlauf, offene Posten
└── Belege         → Angebote UND Rechnungen in einer Liste, Typ-/Status-/Jahresfilter
    ⚙ Einstellungen → Firmenstammdaten + Dokumentvorlage (aus der Tab-Leiste heraus)
```

**Zwei Tabs statt fünf.** Angebot und Rechnung sind aus Listensicht dasselbe — Nummer, Empfänger,
Betrag, Status, Datum. `lib/domain/belege.ts` führt beide zusammen (bewusst in TypeScript und nicht
per SQL-UNION, weil beide Domänen eigene Anzeige-Namensregeln haben: Snapshot > Kunde > Lead). Die
Detailseiten bleiben getrennt, weil sich die Lebenszyklen unterscheiden — GoBD-Unveränderlichkeit
gilt nur für Rechnungen.

`/admin/finanzen/rechnungen` und `/admin/finanzen/angebote` leiten auf `/belege` um, damit alte
Links und Lesezeichen nicht ins Leere laufen. Die Unterrouten (`/[id]`, `/new`, `/nachtragen`)
bleiben unverändert.

**Firmenstammdaten und Vorlage liegen hinter dem Zahnrad.** Grund: `company_settings` wurde am
05.07.2026 einmal gesetzt und seitdem nie geändert — gleichzeitig hängen 12 Aufrufstellen daran
(Absenderzeile, Fußzeile, Signatur, §19-Hinweis). Essenzielle Daten, aber nichts, was
gleichrangig neben der täglichen Arbeit stehen muss.

### Designentscheidungen

- **Weniger Kartenrahmen.** Vorher saß jeder Abschnitt in einer eigenen Karte mit Rand und Schatten,
  und in der Positionsliste steckte zusätzlich jede Position in einer eigenen grauen Box. Jetzt:
  Abschnittsüberschriften und Trennlinien als Gliederung, gerahmt ist nur der Listencontainer.
- **Kennzahlen mit Hierarchie.** Der Jahresumsatz ist die Leitzahl (3xl), die anderen drei sind
  Nebenzahlen. „Überfällig“ färbt sich nur rot, wenn dort tatsächlich etwas steht — bei 0 € tritt es
  grau zurück. Vorher sahen alle vier Kacheln gleich aus.
- **Verteilungslisten mit Anteilsbalken** statt reiner Zahlenspalten (Umsatz nach Kunde/Kategorie).
- **Kompakterer Editor.** Empfänger und Datumsfeld liegen in einem 6-Spalten-Raster statt
  untereinander; Einleitungs- und Schlusstext sind eingeklappt (aufgeklappt, sobald sie gefüllt sind).

Konkrete Änderungen:
1. **Angebote in Finanzen ziehen.** Gleiche Tabelle `offers`, gleicher Domain-Layer. Akquise verlinkt nur
   noch dorthin, statt eine eigene Erstellmaske zu haben. Nebeneffekt: **Angebote werden endlich auch für
   bestehende Kunden erstellbar**, nicht nur aus Leads.
2. **„Rechnung nachtragen" aus der Kopfzeile entfernen** → wird ein Modus-Umschalter innerhalb
   `/rechnungen/new` („Neue Rechnung" / „Bestehende nachtragen"). Ein Primärbutton statt Button + Geisterlink.
3. **Tab-Leiste als Segment-Control** statt Unterstrich-Tabs — konsistent mit dem Look von `AdminNav`.
   `FinanzenTabs.tsx` bekommt Badge-Support (offene Angebote, überfällige Rechnungen) wie die Hauptnav.
4. **Kontextzeile über den Tabs** — Titel („Finanzen") bleibt stehen, der Primärbutton wechselt je Tab
   (Angebote → „Neues Angebot", Rechnungen → „Neue Rechnung", Vorlagen → „Neue Vorlage").
   Heute springt der Button beim Tabwechsel weg, das ist ein Teil des unruhigen Eindrucks.

---

## 7. UI

### 7.1 Dokument-Editor (Split-Screen)

`/admin/finanzen/rechnungen/new`, `/rechnungen/[id]`, `/angebote/new`, `/angebote/[id]` — alle
über eine gemeinsame Shell `components/documents/DocumentEditor.tsx`:

```
┌───────────────────────────┬─────────────────────────────┐
│ Kunde / Projekt           │                             │
│ Nummer · Datum · Leistung │      A4-Vorschau            │
│ ─────────────────────     │      (Paged.js, sticky)     │
│ Positionen                │                             │
│  [Artikel/Paket-Suche ▾]  │      ◀ Seite 1/2 ▶          │
│  Titel                    │                             │
│  Beschreibung (mehrzeilig)│      [PDF prüfen]           │
│  Menge · EP · [Overrides] │      [Als Entwurf sichern]  │
│  + Position               │      [Stellen & versenden]  │
│ ─────────────────────     │                             │
│ Schlusstext               │                             │
└───────────────────────────┴─────────────────────────────┘
```

- `ItemsEditor.tsx` wird wiederverwendet und um `beschreibung` + die Override-Felder erweitert
  (Overrides eingeklappt hinter „⋯", damit die Zeile schmal bleibt).
- Vorschau als `useDeferredValue` → tippt man schnell, rendert die Vorschau nicht bei jedem Anschlag,
  aber ohne feste Debounce-Zeit.
- Mobil: Tab-Umschalter „Bearbeiten / Vorschau" statt Split.

### 7.2 Vorlagen-Editor

`/admin/finanzen/vorlagen` — derselbe Split, links statt Formular die Theme-Controls:

| Gruppe | Tokens |
|--------|--------|
| Seite | Ränder oben/unten/links/rechts, Grundschriftgröße, Zeilenhöhe |
| Marke | Akzentfarbe, Textfarbe, Grau, Logo-Größe, Logo-Position |
| Typografie | Überschriften-Font, Fließtext-Font, Titelgröße |
| Positionstabelle | Spaltenbreiten, Trennlinien an/aus, Zebra-Streifen, Kopfzeilen-Stil |
| Blöcke | Fußzeile an/aus, Bankdaten an/aus, Signaturblock an/aus, Stempelbild |

Rechts eine Vorschau mit **Beispieldaten aus deinem Stresstest** (5 Positionen, lange Firmennamen,
mehrseitiger Schlusstext) — so siehst du Layoutbrüche beim Schrauben sofort, nicht erst beim echten Kunden.

Speichern → `document_themes.tokens` (JSONB). Kein Deploy nötig, um das Layout zu ändern.

---

## 8. Phasenplan

| # | Phase | Umfang | Status |
|---|-------|--------|--------|
| **1** | **Renderer-Kern** | `lib/documents/` + `from-db.ts`. Rechnung + Angebot nach der aktuellen Vorlage. | ✅ **fertig** |
| **2** | **PDF-Route** | `puppeteer-core` + `@sparticuz/chromium@149`, `serverExternalPackages`, `/api/admin/documents/pdf` | ✅ **fertig** |
| **3** | **Live-Vorschau** | Paged.js im iframe, `DocumentPreview.tsx`, Stresstest + Verify-Skript | ✅ **fertig** |
| **4** | **Migration 0036** | Positionsfelder, Freitexte, `recipient`-Snapshot, `client_id` optional, `issue_offer()`, GoBD-Trigger erweitert | ✅ **fertig, eingespielt** |
| **5** | **Dokument-Editor** | `DocumentEditor.tsx` + `PositionsEditor.tsx`, geteilt von Rechnung und Angebot, neu und Bearbeiten | ✅ **fertig** |
| **6** | **Angebote in Finanzen + Navigation** | `/admin/finanzen/angebote` (Liste/neu/Detail), `lib/domain/offers.ts`, Segment-Tabs | ✅ **fertig** |
| **7** | **Vorlagen-Editor** | Theme-Regler auf `/admin/finanzen/vorlagen`, `document_themes`, Snapshot beim Stellen | offen (Seite existiert als reine Ansicht) |
| **8** | **Aufräumen** | Vertrag, Briefing, Übergabe, Care-Report auf den neuen Renderer umstellen | teilweise — Rechnung und Angebot laufen darüber, die vier übrigen noch über pdf-lib |
| **9** | *optional, später* | ZUGFeRD: CII-XML + PDF/A-3-Veredelung via pdf-lib | offen |

### Verifikation

| Kommando | Prüft |
|----------|-------|
| `npm run doc:stresstest` | Rendert 4 Fälle zu HTML + PDF + PNG pro Seite. **Ergebnis: Paged.js-Vorschau und Puppeteer-PDF paginieren identisch (2/2/1/2 Seiten), Seitenformat exakt 210×297 mm.** |
| `npm run doc:verify-preview` | Braucht laufenden Dev-Server. Prüft, dass Paged.js im sandboxed iframe paginiert und genau eine (nicht flackernde) Maßmeldung schickt. |
| `npm run doc:verify-editor` | End-to-End gegen die echte DB: Entwurf ohne Kundendatensatz, Positionsfelder, Summenausschluss, PDF-Erzeugung, Update, Aufräumen. Legt nur Entwürfe an und löscht sie wieder — **zieht bewusst keine Nummer**, damit im RE-/AN-Nummernkreis keine Lücke entsteht. |
| `npm run build:document-assets` | Lädt Fonts neu und regeneriert `assets.generated.ts`. Nur nötig, wenn Logo oder Schriften wechseln. |

**Noch nicht verifiziert:** der Puppeteer-Pfad auf Vercel. Lokal läuft er über das installierte Chrome;
in der Cloud greift `@sparticuz/chromium`, was erst ein Deploy zeigt. Dafür muss vorher
`VERCEL_SUPPORT_LARGE_FUNCTIONS=1` als Environment-Variable im Projekt gesetzt sein.

Ebenfalls nicht automatisiert geprüft: das tatsächliche **Stellen** von Rechnung und Angebot
(`issueInvoice` / `issueOffer`). Beide ziehen eine echte Nummer und laden ins Storage — das lässt
sich nicht testen, ohne eine Nummer zu verbrauchen. Für Rechnungen gibt es dafür den
Testrechnungs-Nummernkreis (`is_test`), für Angebote nicht.

### Was sich gegenüber dem ursprünglichen Plan geändert hat

- **`invoices.client_id` ist jetzt optional.** Der Plan sah nur einen Empfänger-Snapshot vor; für
  „Rechnung ohne Kunden anlegen" musste die Spalte zusätzlich nullable werden. Ein DB-Check stellt
  sicher, dass entweder ein Kunde oder ein `recipient` vorhanden ist.
- **`recipient` friert die Anschrift beim Stellen ein** — auch dann, wenn ein Kunde ausgewählt war.
  Damit ist ein Altfehler behoben: bisher hätte ein Umzug des Kunden dazu geführt, dass
  `regenerateInvoicePdf()` eine alte Rechnung mit der NEUEN Anschrift erzeugt.
- **Angebotsnummern fallen erst beim Stellen** (`issue_offer()`), vorher zog `createOffer` sie schon
  beim Anlegen. Verworfene Entwürfe verbrennen dadurch keine Nummer mehr. Betrifft auch den
  Akquise-Pfad, der mit umgestellt wurde.
- **`document_themes` ist noch nicht angelegt** — kommt erst mit Phase 7, wenn es Regler gibt, die
  darauf schreiben. Bis dahin bleibt `DEFAULT_THEME` die einzige Quelle.

---

## 9. Risiken

| Risiko | Umgang |
|--------|--------|
| Puppeteer-Cold-Start 10–15 s auf Vercel | `maxDuration = 60`. Vorschau läuft ohnehin ohne Server; PDF wird nur beim Stellen/Prüfen erzeugt. |
| Paged.js paginiert minimal anders als Chrome-Print | Deshalb Stufe 2 („PDF prüfen") vor dem Versand. Divergenzen sind Einzelzeilen, keine Blockbrüche. |
| Fußzeile/Seitenzahl als Divergenzpunkt | Beide Pfade aus `buildFusszeile()`; explizite `font-size` im `footerTemplate`. |
| Theme-Änderung verändert alte Rechnungen rückwirkend | `theme_snapshot` beim Stellen einfrieren — GoBD. |
| Bundle-Größe / Large Functions ist Beta | `@sparticuz/chromium-min` mit Remote-Brotli als dokumentierter Notausgang. |
| Migration trifft unveränderliche Rechnungen | Nur `add column` mit Defaults, kein Backfill auf gestellten Rechnungen. |
