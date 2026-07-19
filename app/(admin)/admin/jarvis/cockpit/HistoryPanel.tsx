'use client'

import { RunHistoryTable } from './RunHistoryTable'

/**
 * Zentriertes, großes Modal statt eines schmalen rechten Slide-overs — die Tabelle hat
 * 6 Spalten und war in der alten ~26rem-Breite kaum lesbar. Bewusst NICHT als weiterer
 * rechter Slide-over (wie CockpitNodePanel), sonst überlappen sich beide exakt in
 * derselben Bildschirmregion, falls beide offen wären (siehe openHistory()/openNodePanel()
 * in CockpitExplorer.tsx, die sich jetzt gegenseitig schließen — dieses Modal ist zusätzlich
 * strukturell an einer anderen Stelle, nicht nur per Z-Index abgesichert).
 */
export function HistoryPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <h1 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Run-Historie
          </h1>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Schließen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <RunHistoryTable />
        </div>
      </div>
    </div>
  )
}
