/**
 * Skeleton für die Board-Seiten (Projekte, Kunden): Kopf, Stat-Kacheln, Suchzeile,
 * Status-Leiste und Kartenraster — spiegelt das echte Layout, damit beim Laden
 * nichts springt.
 */
export function AdminBoardSkeleton({ cards = 6, railItems = 6 }: { cards?: number; railItems?: number }) {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 bg-gray-200 rounded-lg" />
          <div className="h-4 w-64 bg-gray-100 rounded mt-2" />
        </div>
        <div className="h-9 w-36 bg-gray-200 rounded-xl" />
      </div>

      {/* Stat-Kacheln */}
      <div className="flex items-center gap-3 flex-wrap">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 w-32 bg-white border border-gray-100 rounded-xl shadow-sm" />
        ))}
      </div>

      {/* Suche + Sortierung */}
      <div className="flex gap-3">
        <div className="h-11 flex-1 bg-white border border-gray-100 rounded-xl shadow-sm" />
        <div className="h-11 w-40 bg-white border border-gray-100 rounded-xl shadow-sm" />
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Status-Leiste */}
        <div className="hidden lg:flex flex-col gap-2 w-56 shrink-0">
          {[...Array(railItems)].map((_, i) => (
            <div key={i} className="h-11 bg-white border border-gray-100 rounded-xl shadow-sm" />
          ))}
        </div>

        {/* Kartenraster */}
        <div className="flex-1 min-w-0 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {[...Array(cards)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3.5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-2/3 bg-gray-100 rounded" />
                  <div className="h-3 w-1/2 bg-gray-50 rounded" />
                </div>
                <div className="h-6 w-20 bg-gray-100 rounded-full shrink-0" />
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full" />
              <div className="border-t border-gray-100 pt-3 flex gap-3">
                <div className="h-3 w-24 bg-gray-50 rounded" />
                <div className="h-3 w-20 bg-gray-50 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
