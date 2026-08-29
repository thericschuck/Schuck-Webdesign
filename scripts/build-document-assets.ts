/**
 * Generiert `lib/documents/assets.generated.ts` — die Fonts und das Logo als base64-Data-URIs.
 *
 * Warum eingebettet und nicht per URL geladen:
 *   * Der PDF-Pfad läuft in einer Vercel-Function ohne System-Fonts. Ohne eingebettete
 *     Schrift fällt Chrome dort auf einen Default zurück und das PDF sieht anders aus
 *     als die Vorschau — genau der Fehler, den dieser Renderer verhindern soll.
 *   * `page.setContent()` löst relative URLs nicht auf; ein `<img src="/Logo_Lang.png">`
 *     bliebe im PDF leer.
 *   * Kein Netzwerkzugriff zur Renderzeit = kein stiller Fallback bei Ausfall.
 *
 * Playfair Display und DM Sans sind Variable Fonts — pro Familie reicht EINE Datei für
 * alle Schnitte (400–700), deshalb sind es nur zwei Downloads.
 *
 * Aufruf: `npm run build:document-assets`
 * Muss nur erneut laufen, wenn Logo oder Schriftfamilien wechseln. Das Ergebnis ist
 * eingecheckt, der Build braucht kein Netz.
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const OUT = path.join(ROOT, 'lib', 'documents', 'assets.generated.ts')

/** Google-Fonts-CSS gibt je nach User-Agent unterschiedliche Formate zurück — mit einem
 * modernen Chrome-UA bekommen wir woff2 (kleinste Variante). */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

const FAMILIES = [
  { name: 'Playfair Display', spec: 'Playfair+Display:wght@400;700' },
  { name: 'DM Sans', spec: 'DM+Sans:wght@400;500;700' },
] as const

/**
 * Zieht aus dem Google-Fonts-CSS die woff2-URL des **latin**-Subsets.
 * Bewusst nur latin: latin-ext verdoppelt die Dateigröße für Zeichen, die auf einer
 * deutschen Rechnung nicht vorkommen. Der `unicode-range` des latin-Subsets deckt
 * Umlaute, ß und € ab (U+0000-00FF bzw. U+20AC).
 */
async function fetchLatinWoff2Url(spec: string): Promise<string> {
  const res = await fetch(`https://fonts.googleapis.com/css2?family=${spec}&display=swap`, {
    headers: { 'User-Agent': UA },
  })
  if (!res.ok) throw new Error(`Google Fonts CSS fehlgeschlagen (${res.status}) für ${spec}`)
  const css = await res.text()

  // Blöcke sind mit "/* latin */" kommentiert; wir nehmen den ersten davon.
  const block = css.split('/* latin */')[1]
  if (!block) throw new Error(`Kein latin-Subset im CSS für ${spec} gefunden.`)
  const match = block.match(/src:\s*url\((https:\/\/[^)]+\.woff2)\)/)
  if (!match) throw new Error(`Keine woff2-URL im latin-Block für ${spec} gefunden.`)
  return match[1]
}

async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Download fehlgeschlagen (${res.status}): ${url}`)
  return Buffer.from(await res.arrayBuffer()).toString('base64')
}

async function main() {
  const fonts: { name: string; base64: string }[] = []

  for (const family of FAMILIES) {
    const url = await fetchLatinWoff2Url(family.spec)
    const base64 = await fetchBase64(url)
    console.log(`  ${family.name}: ${Math.round((base64.length * 3) / 4 / 1024)} KB  ← ${url}`)
    fonts.push({ name: family.name, base64 })
  }

  const logoBase64 = (await readFile(path.join(ROOT, 'public', 'Logo_Lang.png'))).toString('base64')
  console.log(`  Logo_Lang.png: ${Math.round((logoBase64.length * 3) / 4 / 1024)} KB`)

  const file = `// ============================================================================
// GENERIERT von scripts/build-document-assets.ts — nicht von Hand bearbeiten.
// Neu erzeugen mit: npm run build:document-assets
// ============================================================================

${fonts
  .map(
    (f) =>
      `/** ${f.name} — Variable Font (400–700), latin-Subset, woff2 als Data-URI. */\nexport const ${
        f.name === 'DM Sans' ? 'DM_SANS_WOFF2' : 'PLAYFAIR_WOFF2'
      } =\n  'data:font/woff2;base64,${f.base64}'\n`
  )
  .join('\n')}
/** Schuck-Webdesign-Logo (public/Logo_Lang.png, 220x100) als Data-URI. */
export const LOGO_DATA_URI =
  'data:image/png;base64,${logoBase64}'
`

  await writeFile(OUT, file, 'utf8')
  console.log(`\n→ ${path.relative(ROOT, OUT)} geschrieben (${Math.round(file.length / 1024)} KB).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
