'use client'

import { useActionState } from 'react'
import { inviteAdminAction } from './actions'

type State = { status: 'error' | 'success'; message: string } | null

export function InviteAdminForm() {
  const [state, action, pending] = useActionState<State, FormData>(inviteAdminAction, null)

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="full_name" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          placeholder="Max Mustermann"
          disabled={pending}
          className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          E-Mail <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="kollege@schuck-webdesign.de"
          disabled={pending}
          className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors"
        />
      </div>

      {state && (
        <p
          className={`text-sm ${state.status === 'success' ? 'text-green-700' : 'text-red-600'}`}
          style={{ fontFamily: 'var(--font-dm-sans)' }}
          role="status"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-gray-900 text-white text-sm font-semibold rounded-xl py-3 hover:bg-gray-700 disabled:opacity-50 transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        {pending ? 'Wird gesendet…' : 'Einladen'}
      </button>
    </form>
  )
}
