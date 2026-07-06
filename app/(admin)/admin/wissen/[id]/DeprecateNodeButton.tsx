'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deprecateNodeAction } from '../actions'

export function DeprecateNodeButton({ nodeId, isDeprecated }: { nodeId: string; isDeprecated: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isDeprecated) {
    return (
      <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        Dieser Knoten ist deprecated — er fließt nicht mehr in Kontext/Suche ein.
      </p>
    )
  }

  function handleDeprecate() {
    setError(null)
    startTransition(async () => {
      const result = await deprecateNodeAction(nodeId)
      if (result.status === 'error') {
        setError(result.message)
        setShowConfirm(false)
      } else {
        router.refresh()
      }
    })
  }

  if (showConfirm) {
    return (
      <div className="flex flex-col gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
        <p className="text-sm text-gray-800 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Knoten wirklich deprecaten?
        </p>
        <p className="text-xs text-gray-500 leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Kein Hard-Delete — der Knoten bleibt erhalten (Historie), fließt aber nicht mehr in Semantic Search
          oder den automatischen Kontext ein.
        </p>
        {error && (
          <p className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleDeprecate}
            disabled={isPending}
            className="flex-1 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {isPending ? 'Wird deprecated…' : 'Ja, deprecaten'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isPending}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Abbrechen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {error}
        </p>
      )}
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2 px-4 py-2 border border-amber-200 text-amber-700 text-sm font-medium rounded-xl hover:bg-amber-50 transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        Deprecaten
      </button>
    </div>
  )
}
