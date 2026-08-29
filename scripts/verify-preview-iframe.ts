/**
 * Prüft die Live-Vorschau unter realen Browserbedingungen.
 *
 * Zwei Dinge lassen sich nur hier klären, nicht im Unit-Kontext:
 *   1. Lädt "/vendor/paged.polyfill.js" in einem srcdoc-iframe mit
 *      sandbox="allow-scripts" (also ohne allow-same-origin)?
 *   2. Kommt die postMessage mit Höhe/Seitenzahl bei der Elternseite an?
 *
 * Setzt einen laufenden Dev-Server auf http://localhost:3000 voraus (npm run dev).
 * Aufruf: npm run doc:verify-preview
 */
import puppeteer from 'puppeteer-core'
import { renderDocument } from '../lib/documents/render'
import { DEFAULT_THEME } from '../lib/documents/theme'
import { BEISPIEL_RECHNUNG } from '../lib/documents/sample'

const BASIS_URL = process.env.PREVIEW_TEST_URL ?? 'http://localhost:3000'

async function main() {
  const html = renderDocument(BEISPIEL_RECHNUNG, DEFAULT_THEME, 'preview')

  const browser = await puppeteer.launch({
    headless: true,
    ...(process.env.CHROME_EXECUTABLE_PATH
      ? { executablePath: process.env.CHROME_EXECUTABLE_PATH }
      : { channel: 'chrome' as const }),
  })

  try {
    const page = await browser.newPage()
    const konsolenfehler: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') konsolenfehler.push(msg.text())
    })
    page.on('requestfailed', (req) => {
      konsolenfehler.push(`Request fehlgeschlagen: ${req.url()} (${req.failure()?.errorText})`)
    })

    // Irgendeine Seite derselben Origin laden, damit das srcdoc-iframe seine
    // relative Script-URL gegen den Dev-Server auflöst — genauso wie später
    // in der Admin-UI.
    await page.goto(`${BASIS_URL}/login`, { waitUntil: 'domcontentloaded' })

    // Alle Meldungen über 8 s einsammeln, nicht nur die erste — so wird
    // sichtbar, ob der Reporter flackert (mehrere Zwischenstände meldet) oder
    // wie gewollt genau einmal den fertigen Stand schickt.
    const meldungen = await page.evaluate(
      (srcdoc) =>
        new Promise<{ hoehe: number; seiten: number }[]>((resolve) => {
          const gesammelt: { hoehe: number; seiten: number }[] = []
          const iframe = document.createElement('iframe')
          iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin')
          iframe.style.cssText = 'width:794px;height:1123px;border:0;position:fixed;left:-9999px;'
          iframe.srcdoc = srcdoc

          window.addEventListener('message', (event) => {
            const p = event.data
            if (p && p.type === 'schuck-document-preview') {
              gesammelt.push({ hoehe: p.hoehe, seiten: p.seiten })
            }
          })

          window.setTimeout(() => resolve(gesammelt), 8000)
          document.body.appendChild(iframe)
        }),
      html
    )

    if (meldungen.length === 0) {
      console.error('FEHLGESCHLAGEN: keine postMessage aus dem Vorschau-iframe erhalten.')
      if (konsolenfehler.length) console.error('Fehler im Browser:\n  ' + konsolenfehler.join('\n  '))
      process.exit(1)
    }

    const letzte = meldungen[meldungen.length - 1]
    console.log('OK  Paged.js paginierte im Vorschau-iframe.')
    console.log(`    Meldungen:       ${meldungen.length} (${meldungen.map((m) => m.seiten + 'S').join(' → ')})`)
    console.log(`    Seiten final:    ${letzte.seiten}`)
    console.log(`    Höhe final:      ${letzte.hoehe} px`)
    if (konsolenfehler.length) {
      console.log('\nHinweis — Browser meldete außerdem:\n  ' + konsolenfehler.join('\n  '))
    }
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
