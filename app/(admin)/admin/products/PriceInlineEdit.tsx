'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { updateArticlePriceAction } from './actions'

type State = { status: 'success' } | { status: 'error'; message: string } | null

function formatPrice(min: number | null, max: number | null, einheit: string | null) {
  const unit = einheit ? ` / ${einheit}` : ''
  if (min == null && max == null) return '—'
  if (min == null) return `bis ${max!.toLocaleString('de-DE')} €${unit}`
  if (max == null || min === max) return `${min.toLocaleString('de-DE')} €${unit}`
  return `${min.toLocaleString('de-DE')}–${max.toLocaleString('de-DE')} €${unit}`
}

export function PriceInlineEdit({
  artNr,
  preisMin,
  preisMax,
  einheit,
}: {
  artNr: string
  preisMin: number | null
  preisMax: number | null
  einheit: string | null
}) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const bound = updateArticlePriceAction.bind(null, artNr)
  const [state, action, pending] = useActionState<State, FormData>(bound, null)

  useEffect(() => {
    if (state?.status === 'success') setEditing(false)
  }, [state])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        {formatPrice(preisMin, preisMax, einheit)}
        <svg
          className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
        </svg>
      </button>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          name="preis_min"
          type="number"
          step="0.01"
          defaultValue={preisMin ?? ''}
          placeholder="min"
          className="w-16 rounded-md border border-gray-200 px-1.5 py-1 text-xs text-gray-900 outline-none focus:border-gray-400"
        />
        <span className="text-gray-300">–</span>
        <input
          name="preis_max"
          type="number"
          step="0.01"
          defaultValue={preisMax ?? ''}
          placeholder="max"
          className="w-16 rounded-md border border-gray-200 px-1.5 py-1 text-xs text-gray-900 outline-none focus:border-gray-400"
        />
        <button
          type="submit"
          disabled={pending}
          className="p-1 rounded-md text-green-600 hover:bg-green-50 disabled:opacity-50"
          aria-label="Speichern"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="p-1 rounded-md text-gray-400 hover:bg-gray-100"
          aria-label="Abbrechen"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {state?.status === 'error' && <p className="text-xs text-red-600">{state.message}</p>}
    </form>
  )
}
