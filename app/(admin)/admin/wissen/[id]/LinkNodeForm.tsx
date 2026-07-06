'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { searchNodesAction, linkNodeAction, type NodeSearchResult } from '../actions'
import type { EdgeType } from '@/types/database'

const EDGE_TYPE_OPTIONS: EdgeType[] = [
  'relates_to',
  'has_project',
  'has_contact',
  'mentioned_in',
  'contradicts',
  'confirms',
  'learned_from',
  'part_of_session',
]

const inputClass =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50'

export function LinkNodeForm({ fromId }: { fromId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<NodeSearchResult[]>([])
  const [selected, setSelected] = useState<NodeSearchResult | null>(null)
  const [edgeType, setEdgeType] = useState<EdgeType>('relates_to')
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    setSearching(true)
    const found = await searchNodesAction(query)
    setResults(found)
    setSearching(false)
  }

  function handleLink() {
    if (!selected) return
    setError(null)
    startTransition(async () => {
      const result = await linkNodeAction(fromId, selected.id, edgeType)
      if (result.status === 'error') {
        setError(result.message)
      } else {
        setSelected(null)
        setQuery('')
        setResults([])
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {!selected && (
        <>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSearch()
                }
              }}
              placeholder="Zielknoten suchen…"
              className={`flex-1 ${inputClass}`}
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {searching ? '…' : 'Suchen'}
            </button>
          </div>

          {results.length > 0 && (
            <div className="flex flex-col divide-y divide-gray-50 max-h-56 overflow-y-auto border border-gray-100 rounded-lg">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelected(r)
                    setResults([])
                  }}
                  className="text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  <span className="text-xs text-gray-400 mr-2">{r.type}</span>
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {selected && (
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {selected.label}
          </span>
          <select
            value={edgeType}
            onChange={(e) => setEdgeType(e.target.value as EdgeType)}
            disabled={isPending}
            className={inputClass}
          >
            {EDGE_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            onClick={handleLink}
            disabled={isPending}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {isPending ? 'Verlinken…' : 'Verlinken'}
          </button>
          <button
            type="button"
            onClick={() => setSelected(null)}
            disabled={isPending}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
