'use client'

import { useActionState, useState, useRef, useEffect } from 'react'
import { updateLiveUrl } from './actions'

type State = { status: 'success' } | { status: 'error'; message: string } | null

export function LiveUrlEditor({
  projectId,
  liveUrl,
}: {
  projectId: string
  liveUrl: string | null
}) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const bound = updateLiveUrl.bind(null, projectId)
  const [state, action, pending] = useActionState<State, FormData>(bound, null)

  useEffect(() => {
    if (state?.status === 'success') setEditing(false)
  }, [state])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (!editing) {
    return (
      <div className="flex items-center gap-2 group">
        {liveUrl ? (
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 truncate"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {liveUrl.replace(/^https?:\/\//i, '')}
          </a>
        ) : (
          <span className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-dm-sans)' }}>—</span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all shrink-0"
          aria-label="Website-Link bearbeiten"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="text"
        name="live_url"
        placeholder="https://kunde-website.de"
        defaultValue={liveUrl ?? ''}
        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      />
      {state?.status === 'error' && (
        <p className="text-xs text-red-600">{state.message}</p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Speichert…' : 'Speichern'}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}
