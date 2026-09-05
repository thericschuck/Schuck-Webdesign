'use client'

import { useActionState } from 'react'
import { inviteExistingClient } from './actions'

type State = { status: 'error' | 'success'; message: string } | null

export function InviteExistingClientForm({
  clientId,
  defaultName,
  defaultEmail,
}: {
  clientId: string
  defaultName: string
  defaultEmail: string
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    inviteExistingClient.bind(null, clientId),
    null
  )

  return (
    <form action={action} className="flex flex-col gap-3">
      <div>
        <label className="text-xs text-gray-400 mb-1 block" style={{ fontFamily: 'var(--font-dm-sans)' }}>Name</label>
        <input
          type="text"
          name="full_name"
          defaultValue={defaultName}
          required
          disabled={pending}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1 block" style={{ fontFamily: 'var(--font-dm-sans)' }}>E-Mail</label>
        <input
          type="email"
          name="email"
          defaultValue={defaultEmail}
          required
          disabled={pending}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50"
        />
      </div>

      {state && (
        <p
          className={`text-xs leading-relaxed ${state.status === 'success' ? 'text-green-700' : 'text-red-700'}`}
          style={{ fontFamily: 'var(--font-dm-sans)' }}
          role="status"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-gray-900 text-white text-sm font-medium rounded-xl py-2.5 hover:bg-gray-700 disabled:opacity-50 transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        {pending ? 'Wird gesendet…' : 'Einladen'}
      </button>
    </form>
  )
}
