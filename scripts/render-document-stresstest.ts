/**
 * Layout-Stresstest für den Dokument-Renderer.
 *
 * Rendert die Beispieldaten aus `lib/documents/sample.ts` (überlange Namen,
 * mehrzeilige Positionsbeschreibungen, mehrseitiger Schlusstext) zu HTML und
 * PDF und legt beides in einem Ausgabeordner ab. Damit lässt sich nach jeder
 * Layoutänderung prüfen, ob Umbrüche noch zwischen Blöcken statt mitten
 * hindurch laufen.
 *
 * Aufruf:  npm run doc:stresstest [-- <ausgabeordner>]
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import { renderDocument } from '../lib/documents/render'
import { renderDocumentToPdf } from '../lib/documents/pdf'
import { DEFAULT_THEME } from '../lib/documents/theme'
import { BEISPIEL_RECHNUNG, BEISPIEL_ANGEBOT } from '../lib/documents/sample'
import type { DocumentData } from '../lib/documents/types'

const PAGEDJS_PATH = path.join(process.cwd(), 'public', 'vendor', 'paged.polyfill.js')

/**
 * Rendert die Vorschau-Variante (Paged.js) und schießt ein PNG pro Seite.
 *
 * Das prüft zweierlei auf einmal: dass der Paged.js-Pfad überhaupt paginiert,
 * und wie die Umbrüche aussehen — ein PDF lässt sich nicht so einfach
 * betrachten wie ein Bild. Gibt die Seitenzahl zurück, damit sie gegen das
 * PDF gegengeprüft werden kann.
 */
async function screenshotPreviewPages(html: string, outDir: string, name: string): Promise<number> {
  const browser = await puppeteer.launch({
    headless: true,
    ...(process.env.CHROME_EXECUTABLE_PATH
      ? { executablePath: process.env.CHROME_EXECUTABLE_PATH }
      : { channel: 'chrome' as const }),
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1000, height: 1400, deviceScaleFactor: 1.5 })

    // Das <script src="/vendor/..."> im Vorschau-HTML zeigt auf den Next-Server,
    // den es hier nicht gibt — deshalb ohne Tag laden und den Polyfill direkt
    // aus node_modules injizieren.
    await page.setContent(html.replace('<script src="/vendor/paged.polyfill.js"></script>', ''), {
      waitUntil: 'load',
    })
    await page.evaluate(() => document.fonts.ready)
    await page.addScriptTag({ path: PAGEDJS_PATH })
    await page.waitForSelector('.pagedjs_page', { timeout: 30_000 })
    // Paged.js legt die Seiten nacheinander an; kurz warten, bis nichts mehr dazukommt.
    await page.waitForFunction(
      () => {
        const w = window as unknown as { __pagedCount?: number }
        const now = document.querySelectorAll('.pagedjs_page').length
        const stable = w.__pagedCount === now
        w.__pagedCount = now
        return stable
      },
      { polling: 400, timeout: 30_000 }
    )

    const seiten = await page.$$('.pagedjs_page')
    for (const [index, seite] of seiten.entries()) {
      await seite.screenshot({ path: path.join(outDir, `${name}.seite-${index + 1}.png`) as `${string}.png` })
    }
    return seiten.length
  } finally {
    await browser.close()
  }
}

const OUT_DIR = path.resolve(process.argv[2] ?? path.join(process.cwd(), '.stresstest'))

const FAELLE: { name: string; data: DocumentData }[] = [
  { name: 'rechnung', data: BEISPIEL_RECHNUNG },
  { name: 'angebot', data: BEISPIEL_ANGEBOT },
  // Kurzes Dokument: prüft, dass Summe/Signatur/Fußzeile auf einer Seite nicht
  // kollidieren, wenn kaum Inhalt da ist.
  {
    name: 'rechnung-kurz',
    data: {
      ...BEISPIEL_RECHNUNG,
      nummer: 'RE-2026-043',
      positionen: BEISPIEL_RECHNUNG.positionen.slice(0, 1),
      summe: { ...BEISPIEL_RECHNUNG.summe, netto: 3400 },
      schlusstext: null,
    },
  },
  // Entwurf: prüft Wasserzeichen und fehlende Nummer.
  {
    name: 'rechnung-entwurf',
    data: { ...BEISPIEL_RECHNUNG, nummer: null, entwurf: true },
  },
]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  for (const fall of FAELLE) {
    const htmlPreview = renderDocument(fall.data, DEFAULT_THEME, 'preview')
    const htmlPrint = renderDocument(fall.data, DEFAULT_THEME, 'print')
    await writeFile(path.join(OUT_DIR, `${fall.name}.preview.html`), htmlPreview, 'utf8')

    const pdf = await renderDocumentToPdf(fall.data, DEFAULT_THEME)
    await writeFile(path.join(OUT_DIR, `${fall.name}.pdf`), pdf)

    const seiten = await screenshotPreviewPages(htmlPreview, OUT_DIR, fall.name)

    console.log(
      `${fall.name.padEnd(20)} HTML ${String(Math.round(htmlPrint.length / 1024)).padStart(4)} KB   ` +
        `PDF ${String(Math.round(pdf.byteLength / 1024)).padStart(4)} KB   ` +
        `Vorschau ${seiten} Seite(n)`
    )
  }

  console.log(`\n→ ${OUT_DIR}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
