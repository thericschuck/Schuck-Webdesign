'use client'

import Link from 'next/link'
import { colorForType, labelForType, type GraphNode } from './types'

export function NodePanel({
  node,
  onClose,
  showLoadNeighborhood,
  loadingNeighborhood,
  onLoadNeighborhood,
}: {
  node: GraphNode
  onClose: () => void
  showLoadNeighborhood: boolean
  loadingNeighborhood: boolean
  onLoadNeighborhood: () => void
}) {
  return (
    <div className="fixed inset-y-0 right-0 z-30 w-full sm:w-96 bg-[#0d0d0d]/80 backdrop-blur-2xl border-l border-white/10 shadow-2xl shadow-black/60 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: colorForType(node.type), boxShadow: `0 0 8px ${colorForType(node.type)}` }}
          />
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {labelForType(node.type)}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Schließen"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-playfair)' }}>
          {node.label}
        </h1>

        <dl className="flex flex-col gap-3">
          {node.number && (
            <div>
              <dt className="text-xs text-white/40 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Nummer
              </dt>
              <dd className="text-sm text-white/80 font-mono" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {node.number}
              </dd>
            </div>
          )}
          {node.status && (
            <div>
              <dt className="text-xs text-white/40 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Status
              </dt>
              <dd className="text-sm text-white/80" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {node.status}
              </dd>
            </div>
          )}
        </dl>

        {showLoadNeighborhood && (
          <button
            onClick={onLoadNeighborhood}
            disabled={loadingNeighborhood}
            className="px-4 py-2 bg-white/10 text-white/80 text-sm font-medium rounded-xl hover:bg-white/15 disabled:opacity-50 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {loadingNeighborhood ? 'Lädt…' : 'Nachbarschaft laden'}
          </button>
        )}
      </div>

      <div className="px-5 py-4 border-t border-white/10">
        <Link
          href={node.url}
          className="block w-full text-center px-4 py-2.5 bg-[#7F77DD] text-white text-sm font-medium rounded-xl hover:bg-[#8f88e8] transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Zur Detailseite →
        </Link>
      </div>
    </div>
  )
}
