'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { listLinkableNodesAction, linkNodeAction, type NodeSearchResult } from '../actions'
import type { EdgeType, NodeType } from '@/types/database'

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

const TYPE_LABEL: Record<NodeType, string> = {
  client: 'Kunde',
  project: 'Projekt',
  contact: 'Kontakt',
  fact: 'Fakt',
  preference: 'Präferenz',
  note: 'Notiz',
  process: 'Prozess',
  product: 'Produkt',
  session: 'Session',
}

const inputClass =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50'

export function LinkNodeForm({ fromId }: { fromId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [nodes, setNodes] = useState<NodeSearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<NodeSearchResult | null>(null)
  const [edgeType, setEdgeType] = useState<EdgeType>('relates_to')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listLinkableNodesAction(fromId).then((found) => {
      if (!cancelled) {
        setNodes(found)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [fromId])

  const groups = new Map<NodeType, NodeSearchResult[]>()
  for (const n of nodes) {
    if (!groups.has(n.type)) groups.set(n.type, [])
    groups.get(n.type)!.push(n)
  }

  function handleSelectChange(nodeId: string) {
    setSelected(nodes.find((n) => n.id === nodeId) ?? null)
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
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={selected?.id ?? ''}
          onChange={(e) => handleSelectChange(e.target.value)}
          disabled={loading || isPending}
          className={`flex-1 min-w-48 ${inputClass}`}
        >
          <option value="" disabled>
            {loading ? 'Lädt…' : nodes.length === 0 ? 'Keine anderen Knoten vorhanden' : 'Zielknoten wählen…'}
          </option>
          {[...groups.entries()].map(([type, typeNodes]) => (
            <optgroup key={type} label={TYPE_LABEL[type] ?? type}>
              {typeNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {selected && (
          <>
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
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
