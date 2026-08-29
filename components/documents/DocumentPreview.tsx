'use client'

import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { renderDocument, PREVIEW_MESSAGE_TYPE } from '@/lib/documents/render'
import type { DocumentData, DocumentTheme } from '@/lib/documents/types'

/**
 * Seitengenaue Live-Vorschau des Dokuments.
 *
 * Rendert `renderDocument(...)` — dieselbe Funktion, die serverseitig das PDF
 * erzeugt — in ein iframe. Im Vorschaumodus zieht das HTML das Paged.js-
 * Polyfill nach (`/vendor/paged.polyfill.js`), das die CSS-Paged-Media-Regeln
 * im Browser anwendet. Ohne dieses Polyfill wären `break-inside: avoid`,
 * `orphans`/`widows` und `@page` wirkungslos und man sähe einen Endlos-Flow
 * statt echter A4-Seiten — also genau das nicht, was geprüft werden soll.
 *
 * Es gibt hier bewusst KEINEN Server-Roundtrip: das HTML entsteht lokal, die
 * Vorschau ist ohne Netzwerk sofort da.
 */

/** Breite einer A4-Seite in CSS-Pixeln (210 mm bei 96 dpi) plus Rand für den
 * Seitenschatten, den das Vorschau-CSS zeichnet. */
const A4_BREITE_PX = 794
const RAHMEN_PX = 48

export function DocumentPreview({
  data,
  theme,
  /** Link zum echten PDF ("Exakt-Vorschau"). Ohne den Wert wird der Button ausgeblendet. */
  pdfUrl,
  className = '',
}: {
  data: DocumentData
  theme: DocumentTheme
  pdfUrl?: string
  className?: string
}) {
  // Beim schnellen Tippen soll nicht jeder Anschlag eine Neu-Pagination
  // auslösen — useDeferredValue verschiebt das Rendern auf die nächste ruhige
  // Phase, ohne dass eine feste Debounce-Zeit geraten werden muss.
  const deferredData = useDeferredValue(data)
  const deferredTheme = useDeferredValue(theme)
  const veraltet = deferredData !== data || deferredTheme !== theme

  const html = useMemo(
    () => renderDocument(deferredData, deferredTheme, 'preview'),
    [deferredData, deferredTheme]
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [hoehe, setHoehe] = useState(1123) // A4-Höhe in px als Startwert
  const [seiten, setSeiten] = useState(0)

  // Die Vorschau skaliert auf die Panelbreite herunter, statt horizontal zu
  // scrollen — ein Dokument will man als Ganzes sehen.
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      const verfuegbar = el.clientWidth
      setScale(Math.min(1, verfuegbar / (A4_BREITE_PX + RAHMEN_PX)))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Das iframe meldet seine Maße selbst per postMessage (siehe
  // PREVIEW_REPORTER_JS in render.ts) — von außen messen geht nicht, weil das
  // iframe ohne allow-same-origin läuft.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const payload = event.data
      if (!payload || payload.type !== PREVIEW_MESSAGE_TYPE) return
      if (typeof payload.hoehe === 'number' && payload.hoehe > 0) setHoehe(payload.hoehe)
      if (typeof payload.seiten === 'number') setSeiten(payload.seiten)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <span
          className="text-xs text-gray-400"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
          aria-live="polite"
        >
          {veraltet
            ? 'Aktualisiert …'
            : seiten > 0
              ? `Vorschau · ${seiten} ${seiten === 1 ? 'Seite' : 'Seiten'}`
              : 'Vorschau wird paginiert …'}
        </span>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            PDF prüfen →
          </a>
        )}
      </div>

      <div
        ref={containerRef}
        className="overflow-hidden rounded-xl bg-gray-100"
        style={{ height: hoehe * scale }}
      >
        <iframe
          title="Dokumentvorschau"
          srcDoc={html}
          // allow-same-origin ist hier leider Pflicht: ohne diese Freigabe
          // paginiert Paged.js nicht — es lädt zwar, übernimmt den Inhalt und
          // bleibt dann still stehen (0 Seiten, leerer Body). Nachgemessen in
          // scripts/verify-preview-iframe.ts.
          //
          // Damit ist die iframe-Isolation faktisch aufgehoben, deshalb zwei
          // Absicherungen im Renderer: alle Daten laufen durch escapeHtml()
          // (render.ts) und alle Theme-Werte durch cssWert()/Number() (css.ts).
          // Der Inhalt ist also durchgehend selbst erzeugtes Markup, in das
          // keine fremden Zeichenketten unescaped gelangen.
          sandbox="allow-scripts allow-same-origin"
          scrolling="no"
          style={{
            width: A4_BREITE_PX + RAHMEN_PX,
            height: hoehe,
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            opacity: veraltet ? 0.6 : 1,
            transition: 'opacity 120ms linear',
          }}
        />
      </div>
    </div>
  )
}
