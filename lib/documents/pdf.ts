import puppeteer, { type Browser } from 'puppeteer-core'
import type { DocumentData, DocumentTheme } from './types'
import { renderDocument, buildSeitenzahlFooterHtml } from './render'

/**
 * HTML → PDF über Headless Chrome.
 *
 * Server-only (importiert puppeteer-core). Der Renderer selbst (`render.ts`)
 * bleibt frei von Node-Abhängigkeiten, damit die Browser-Vorschau denselben
 * Code benutzen kann — hier wird nur noch gerastert.
 *
 * Deployment: `puppeteer-core` + `@sparticuz/chromium` müssen in
 * `next.config.ts` unter `serverExternalPackages` stehen, sonst versucht der
 * Bundler die Chromium-Binary mitzupacken. Auf Vercel braucht das Projekt
 * `VERCEL_SUPPORT_LARGE_FUNCTIONS=1` (Large Functions, bis 5 GB) — das volle
 * Chromium-Paket liegt über dem 250-MB-Standardlimit.
 */

/**
 * Startet Chrome. In der Cloud die mitgelieferte Chromium-Binary, lokal das
 * installierte Chrome — so muss im Repo keine 150-MB-Binary liegen.
 * `CHROME_EXECUTABLE_PATH` überschreibt die lokale Auflösung, falls Chrome an
 * einem ungewöhnlichen Ort liegt.
 */
async function launchBrowser(): Promise<Browser> {
  const inServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)

  if (inServerless) {
    const chromium = (await import('@sparticuz/chromium')).default
    // Ohne WebGL/Swiftshader: das Entpacken des Grafik-Stacks kostet mehrere
    // Sekunden Cold-Start und ein Rechnungslayout braucht ihn nicht.
    chromium.setGraphicsMode = false
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  }

  const executablePath = process.env.CHROME_EXECUTABLE_PATH
  return puppeteer.launch({
    headless: true,
    ...(executablePath ? { executablePath } : { channel: 'chrome' as const }),
  })
}

export interface RenderPdfOptions {
  /** Seitenzahlen in der Fußzeile (aus `theme.bloecke.seitenzahlen`). */
  seitenzahlen?: boolean
  theme: DocumentTheme
}

/** Rastert einen fertigen HTML-String zu einem A4-PDF. */
export async function renderHtmlToPdf(html: string, options: RenderPdfOptions): Promise<Uint8Array> {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })

    // Ohne dieses Warten rastert Chrome gelegentlich, bevor die eingebetteten
    // Fonts dekodiert sind — das PDF hätte dann die Metriken der Fallback-
    // Schrift und die Umbrüche säßen anders als in der Vorschau.
    await page.evaluate(() => document.fonts.ready)

    const seitenzahlen = options.seitenzahlen ?? options.theme.bloecke.seitenzahlen

    const pdf = await page.pdf({
      format: 'A4',
      // Ränder kommen aus @page im Theme-CSS, nicht aus Puppeteer-Optionen —
      // sonst gäbe es zwei Quellen für dieselbe Zahl.
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: seitenzahlen,
      // Ohne leeres headerTemplate setzt Chrome von sich aus Datum und Titel
      // in den oberen Rand.
      headerTemplate: '<div></div>',
      footerTemplate: seitenzahlen ? buildSeitenzahlFooterHtml(options.theme) : '<div></div>',
    })

    return new Uint8Array(pdf)
  } finally {
    await browser.close()
  }
}

/** Bequemlichkeit: Daten → PDF in einem Aufruf. */
export async function renderDocumentToPdf(
  data: DocumentData,
  theme: DocumentTheme
): Promise<Uint8Array> {
  return renderHtmlToPdf(renderDocument(data, theme, 'print'), { theme })
}
