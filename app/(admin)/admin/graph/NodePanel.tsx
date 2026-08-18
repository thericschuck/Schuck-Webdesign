'use client'

import Link from 'next/link'
import { colorForNode, labelForLeadStatus, labelForType, type GraphNode } from './types'

export interface NodeConnection {
  id: string
  label: string
  type: string
  status?: string | null
}

export function NodePanel({
  node,
  onClose,
  connections,
  onSelectConnection,
  showLoadNeighborhood,
  loadingNeighborhood,
  onLoadNeighborhood,
}: {
  node: GraphNode
  onClose: () => void
  connections: NodeConnection[]
  onSelectConnection: (id: string) => void
  showLoadNeighborhood: boolean
  loadingNeighborhood: boolean
  onLoadNeighborhood: () => void
}) {
  return (
    <div className="fixed inset-y-0 right-0 z-70 w-full sm:w-96 bg-white border-l border-gray-100 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorForNode(node) }} />
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
                {node.type === 'lead' ? labelForLeadStatus(node.status) : node.status}
              </dd>
            </div>
          )}
          {node.details?.map((detail) => (
            <div key={detail.label}>
              <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {detail.label}
              </dt>
              <dd className="text-sm text-gray-800 wrap-break-word" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {detail.label === 'E-Mail' ? (
                  <a href={`mailto:${detail.value}`} className="hover:underline">
                    {detail.value}
                  </a>
                ) : detail.label === 'Website' ? (
                  <a
                    href={detail.value.startsWith('http') ? detail.value : `https://${detail.value}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {detail.value}
                  </a>
                ) : (
                  detail.value
                )}
              </dd>
            </div>
          ))}
        </dl>

        {connections.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Verbindungen ({connections.length})
            </h2>
            <div className="flex flex-col gap-1">
              {connections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectConnection(c.id)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorForNode(c) }} />
                  <span className="flex-1 min-w-0 text-sm text-gray-800 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {c.label}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide shrink-0" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {labelForType(c.type)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

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
