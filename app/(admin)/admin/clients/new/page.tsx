'use client'

import { useActionState } from 'react'
import { inviteClient } from './actions'

type State =
  | { status: 'success'; email: string }
  | { status: 'error'; message: string }
  | null

export default function NewClientPage() {
  const [state, action, pending] = useActionState<State, FormData>(
    inviteClient,
    null
  )

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold mb-6">Neuen Kunden einladen</h1>

      {state?.status === 'success' ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Einladung an <strong>{state.email}</strong> gesendet.
          Der Kunde erhält einen Magic-Link zum ersten Login.
        </div>
      ) : (
        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Max Mustermann"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black disabled:opacity-50"
              disabled={pending}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              E-Mail <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="kunde@beispiel.de"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black disabled:opacity-50"
              disabled={pending}
            />
          </div>

          {state?.status === 'error' && (
            <p className="text-sm text-red-600">{state.message}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {pending ? 'Sendet Einladung…' : 'Einladung senden'}
          </button>
        </form>
      )}
    </div>
  )
}
