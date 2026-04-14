'use client'

import { useActionState } from 'react'
import { signInWithEmail } from './actions'

type State = { status: 'success' } | { status: 'error'; message: string } | null

export default function LoginPage() {
  const [state, action, pending] = useActionState<State, FormData>(
    signInWithEmail,
    null
  )

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-2">Kundenportal</h1>
        <p className="text-sm text-gray-500 mb-8">
          Gib deine E-Mail-Adresse ein. Falls du eingeladen wurdest, erhältst
          du einen Login-Link.
        </p>

        {state?.status === 'success' ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Falls du einen Account hast, haben wir dir einen Link geschickt.
            Bitte prüfe dein Postfach.
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                E-Mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="du@beispiel.de"
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
              {pending ? 'Sende Link…' : 'Login-Link anfordern'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
