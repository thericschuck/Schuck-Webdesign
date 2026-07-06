'use client'

import { useActionState } from 'react'
import { inviteClient } from './actions'
import Link from 'next/link'

type State =
  | { status: 'success'; email: string; clientId: string }
  | { status: 'error'; message: string }
  | null

export default function NewClientPage() {
  const [state, action, pending] = useActionState<State, FormData>(inviteClient, null)

  if (state?.status === 'success') {
    return (
      <div className="max-w-lg">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Einladung gesendet!
          </h2>
          <p className="text-gray-500 text-sm mb-6" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            <strong className="text-gray-700">{state.email}</strong> erhält einen Link zum Einrichten des Accounts.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href={`/admin/clients/${state.clientId}`}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Zum Kundenprofil
            </Link>
            <Link
              href="/admin/clients/new"
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Weiteren einladen
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Neuen Kunden einladen
        </h1>
        <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Der Kunde erhält eine E-Mail zum Einrichten seines Passworts.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <form action={action} className="flex flex-col gap-5">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Max Mustermann"
              disabled={pending}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Firmenname */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="company_name" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Firmenname <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="company_name"
              name="company_name"
              type="text"
              placeholder="Mustermann GmbH"
              disabled={pending}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors"
            />
          </div>

          {/* E-Mail */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              E-Mail <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="kunde@beispiel.de"
              disabled={pending}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors"
            />
          </div>

          {state?.status === 'error' && (
            <p className="text-sm text-red-600 -mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-gray-900 text-white text-sm font-semibold rounded-xl py-3 hover:bg-gray-700 disabled:opacity-50 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {pending ? 'Einladung wird gesendet…' : 'Einladung senden'}
          </button>
        </form>
      </div>
    </div>
  )
}
