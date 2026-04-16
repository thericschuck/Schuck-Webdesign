'use client'

import { useActionState, useRef, useEffect } from 'react'
import { addProjectUpdate } from './actions'

type State = { status: 'error'; message: string } | { status: 'success' } | null

export function AddUpdateForm({ projectId }: { projectId: string }) {
  const boundAction = addProjectUpdate.bind(null, projectId)
  const [state, action, pending] = useActionState<State, FormData>(boundAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  // Reset form on success
  useEffect(() => {
    if (state?.status === 'success') {
      formRef.current?.reset()
    }
  }, [state])

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <textarea
        name="message"
        rows={3}
        required
        disabled={pending}
        placeholder="z.B. Design-Entwurf wurde heute abgeschlossen. Der Kunde wird benachrichtigt…"
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 resize-none transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      />

      {state?.status === 'error' && (
        <p className="text-sm text-red-600 -mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {state.message}
        </p>
      )}
      {state?.status === 'success' && (
        <p className="text-sm text-green-600 -mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Update gepostet ✓
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          {pending ? 'Posten…' : 'Posten'}
        </button>
      </div>
    </form>
  )
}
