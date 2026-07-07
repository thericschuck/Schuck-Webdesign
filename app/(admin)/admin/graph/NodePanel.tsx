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
    <div className="fixed inset-y-0 right-0 z-70 w-full sm:w-96 bg-white border-l border-gray-100 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorForType(node.type) }} />
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {labelForType(node.type)}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Schließen"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        <h1 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          {node.label}
        </h1>

        <dl className="flex flex-col gap-3">
          {node.number && (
            <div>
              <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Nummer
              </dt>
              <dd className="text-sm text-gray-800 font-mono" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {node.number}
              </dd>
            </div>
          )}
          {node.status && (
            <div>
              <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Status
              </dt>
              <dd className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {node.status}
              </dd>
            </div>
          )}
        </dl>

        {showLoadNeighborhood && (
          <button
            onClick={onLoadNeighborhood}
            disabled={loadingNeighborhood}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {loadingNeighborhood ? 'Lädt…' : 'Nachbarschaft laden'}
          </button>
        )}
      </div>

      <div className="px-5 py-4 border-t border-gray-100">
        <Link
          href={node.url}
          className="block w-full text-center px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Zur Detailseite →
        </Link>
      </div>
    </div>
  )
}
