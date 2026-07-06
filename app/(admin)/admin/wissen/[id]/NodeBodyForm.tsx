'use client'

import { useActionState } from 'react'
import { updateNodeAction } from '../actions'
import type { KnowledgeNode } from '@/types/database'

type State = { status: 'error'; message: string } | { status: 'success' } | null

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50'

export function NodeBodyForm({ node }: { node: KnowledgeNode }) {
  const boundAction = updateNodeAction.bind(null, node.id)
  const [state, action, pending] = useActionState<State, FormData>(boundAction, null)

  return (
    <form action={action} className="flex flex-col gap-3">
      <div>
        <label className="text-xs text-gray-500 block mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Label
        </label>
        <input name="label" required disabled={pending} defaultValue={node.label} className={inputClass} />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Text
        </label>
        <textarea
          name="body"
          rows={5}
          disabled={pending}
          defaultValue={node.body ?? ''}
          className={`${inputClass} resize-none`}
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Confidence
        </label>
        <select name="confidence" disabled={pending} defaultValue={node.confidence} className={inputClass}>
          <option value="high">Hoch</option>
          <option value="medium">Mittel</option>
          <option value="low">Niedrig</option>
          <option value="deprecated">Deprecated</option>
        </select>
      </div>

      {state?.status === 'error' && (
        <p className="text-sm text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {state.message}
        </p>
      )}
      {state?.status === 'success' && (
        <p className="text-sm text-green-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Gespeichert.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        {pending ? 'Speichern…' : 'Speichern'}
      </button>
    </form>
  )
}
