/**
 * Skeletons für den Kundenbereich — Gegenstück zu components/admin/AdminBoardSkeleton.tsx.
 *
 * Wichtig ist nicht "irgendein Platzhalter", sondern dass die Maße denen der echten Seite
 * entsprechen: gleiche Kartenradien, gleiche Abstände, gleiche Höhen. Sonst springt das
 * Layout in dem Moment, in dem die Daten da sind, und genau das fühlt sich zäh an.
 *
 * Nebeneffekt der loading.tsx-Dateien, die diese Bausteine nutzen: Next.js schaltet die
 * Navigation sofort um (die URL und die aktive Nav-Pille aktualisieren sich direkt) statt
 * erst zu warten, bis die Server-Daten der Zielseite fertig sind.
 */

/** Heller Seitenkopf (Titel + Unterzeile) wie auf /portal/documents. */
export function PortalHeaderSkeleton({ titleWidth = 'w-40' }: { titleWidth?: string }) {
  return (
    <div>
      <div className={`h-7 ${titleWidth} rounded-lg bg-black/8`} />
      <div className="mt-2 h-4 w-56 rounded bg-black/5" />
    </div>
  )
}

/** Dunkler Willkommens-Banner des Dashboards. */
export function PortalBannerSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-4xl border border-white/6 bg-[#080808] px-7 py-8 md:px-10 md:py-10">
      <div className="h-3 w-32 rounded bg-white/10" />
      <div className="mt-4 h-10 w-64 max-w-full rounded-xl bg-white/12" />
      <div className="mt-4 h-4 w-40 rounded bg-white/6" />
    </div>
  )
}

/** Beschriftung einer Sektion ("Deine Projekte", "Dokumente"). */
function SectionLabel() {
  return <div className="mb-4 h-3 w-28 rounded bg-black/8" />
}

/** Projektkarten-Raster des Dashboards. */
export function PortalProjectCardsSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <section>
      <SectionLabel />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[...Array(cards)].map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-[26px] border border-black/6 bg-[#F7F5F0]"
            style={{ boxShadow: '0 6px 24px rgba(0,0,0,0.06)' }}
          >
            <div className="h-1 w-full bg-black/8" />
            <div className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="h-6 w-40 rounded-lg bg-black/8" />
                <div className="h-6 w-20 shrink-0 rounded-full bg-black/6" />
              </div>
              {/* StatusTimeline */}
              <div className="flex items-center gap-1.5">
                {[...Array(5)].map((_, s) => (
                  <div key={s} className="h-1.5 flex-1 rounded-full bg-black/6" />
                ))}
              </div>
              <div className="mt-4 flex items-start justify-between gap-4 border-t border-black/6 pt-3.5">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 rounded bg-black/5" />
                  <div className="h-3 w-20 rounded bg-black/4" />
                </div>
                <div className="mt-0.5 h-4 w-4 shrink-0 rounded bg-black/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Dokumentenliste des Dashboards. */
export function PortalDocumentListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div className="h-3 w-24 rounded bg-black/8" />
        <div className="h-3 w-20 rounded bg-black/5" />
      </div>
      <div
        className="overflow-hidden rounded-[26px] border border-black/6 bg-[#F7F5F0]"
        style={{ boxShadow: '0 6px 24px rgba(0,0,0,0.06)' }}
      >
        <ul className="divide-y divide-black/5">
          {[...Array(rows)].map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-4 w-4 shrink-0 rounded bg-black/6" />
              <div className="h-3.5 flex-1 rounded bg-black/5" />
              <div className="h-3 w-16 shrink-0 rounded bg-black/4" />
            </li>
          ))}
        </ul>
        <div className="border-t border-black/5 px-4 py-3">
          <div className="h-3 w-32 rounded bg-black/5" />
        </div>
      </div>
    </section>
  )
}

/** Datei-Explorer auf /portal/documents: Toolbar-Zeile + Zeilenliste in einer Karte. */
export function PortalExplorerSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
        <div className="h-6 w-6 rounded-lg bg-gray-100" />
        <div className="h-4 w-24 rounded bg-gray-100" />
        <div className="ml-auto flex gap-2">
          <div className="h-8 w-28 rounded-lg bg-gray-100" />
          <div className="h-8 w-24 rounded-lg bg-gray-900/10" />
        </div>
      </div>

      {/* Zeilen */}
      <div className="divide-y divide-gray-50 pb-2">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="h-7 w-7 shrink-0 rounded bg-gray-100" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-48 max-w-full rounded bg-gray-100" />
              <div className="h-3 w-24 rounded bg-gray-50" />
            </div>
            <div className="h-3 w-16 shrink-0 rounded bg-gray-50" />
          </div>
        ))}
      </div>
    </div>
  )
}
