import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { DomainError } from '@/lib/domain/errors'
import { ladeDokument, type RenderbarerTyp } from '@/lib/domain/document-render'
import { renderDocument } from '@/lib/documents/render'
import { renderHtmlToPdf } from '@/lib/documents/pdf'

/**
 * Rendert eine Rechnung oder ein Angebot als PDF — über denselben Renderer,
 * den die Live-Vorschau im Browser benutzt (`lib/documents/render.ts`).
 *
 *   GET /api/admin/documents/pdf?typ=rechnung&id=<uuid>[&download=1]
 *
 * Ohne `download` kommt das PDF mit `inline` zurück, damit es sich direkt in
 * einem iframe anzeigen lässt ("PDF prüfen" im Editor).
 */

// Puppeteer braucht die Node-Runtime — Edge kann keinen Browserprozess starten.
export const runtime = 'nodejs'
// Ein warmer Render dauert 2–5 s, ein kalter mit Chromium-Start 10–15 s.
export const maxDuration = 60

const ERLAUBTE_TYPEN: RenderbarerTyp[] = ['rechnung', 'angebot']

export async function GET(request: Request) {
  await assertAdmin()

  const url = new URL(request.url)
  const typ = url.searchParams.get('typ')
  const id = url.searchParams.get('id')
  const download = url.searchParams.get('download') === '1'

  if (!typ || !ERLAUBTE_TYPEN.includes(typ as RenderbarerTyp)) {
    return NextResponse.json(
      { error: `Unbekannter Dokumenttyp. Erlaubt: ${ERLAUBTE_TYPEN.join(', ')}.` },
      { status: 400 }
    )
  }
  if (!id) {
    return NextResponse.json({ error: 'Parameter "id" fehlt.' }, { status: 400 })
  }

  try {
    const { data, theme, dateiname } = await ladeDokument(typ as RenderbarerTyp, id)
    const html = renderDocument(data, theme, 'print')
    const pdf = await renderHtmlToPdf(html, { theme })

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${dateiname}.pdf"`,
        // Ein Entwurf ändert sich bei jedem Tastendruck — nie cachen.
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof DomainError ? error.message : 'PDF konnte nicht erzeugt werden.'
    // Fehler aus dem Browserstart (fehlendes Chrome lokal, Speicherlimit in der
    // Cloud) sind keine DomainErrors — die sollen im Log sichtbar bleiben.
    if (!(error instanceof DomainError)) console.error('[documents/pdf]', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
