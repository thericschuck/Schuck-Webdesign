'use client'

import { useActionState, useState } from 'react'
import { createClientAction } from './actions'
import Link from 'next/link'

type State =
  | { status: 'success'; clientId: string; invited: boolean; email: string | null }
  | { status: 'error'; message: string }
  | null

export default function NewClientPage() {
  const [state, action, pending] = useActionState<State, FormData>(createClientAction, null)
  const [sendInvite, setSendInvite] = useState(false)

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
            {state.invited ? 'Kunde angelegt & eingeladen!' : 'Kunde angelegt!'}
          </h2>
          <p className="text-gray-500 text-sm mb-6" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {state.invited ? (
              <>
                <strong className="text-gray-700">{state.email}</strong> erhält einen Link zum Einrichten des Accounts.
              </>
            ) : (
              'Der Kunde hat noch keinen Portal-Zugang — du kannst ihn jederzeit über das Kundenprofil nachträglich einladen.'
            )}
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
              Weiteren anlegen
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
          Neuen Kunden anlegen
        </h1>
        <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Ohne Portal-Einladung — Adresse, Notizen und weitere Details lassen sich danach auf dem Kundenprofil ergänzen.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <form action={action} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Name <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal"> (Anzeigename)</span>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="first_name" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Vorname <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                placeholder="Max"
                disabled={pending}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="last_name" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Nachname <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                placeholder="Mustermann"
                disabled={pending}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors"
              />
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Telefon <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                disabled={pending}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="website" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Website <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="website"
                name="website"
                type="url"
                placeholder="https://beispiel.de"
                disabled={pending}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              E-Mail {sendInvite ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(optional)</span>}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required={sendInvite}
              placeholder="kunde@beispiel.de"
              disabled={pending}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors"
            />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              name="send_invite"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
              disabled={pending}
              className="mt-0.5 rounded"
            />
            <span className="text-sm text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Sofort zum Portal einladen
              <span className="block text-xs text-gray-400 mt-0.5">
                {sendInvite
                  ? 'Der Kunde erhält sofort eine echte E-Mail zum Einrichten seines Accounts.'
                  : 'Der Kunde wird ohne Portal-Zugang angelegt — Einladen kannst du jederzeit später über das Kundenprofil nachholen.'}
              </span>
            </span>
          </label>

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
            {pending ? 'Wird angelegt…' : sendInvite ? 'Anlegen & einladen' : 'Kunde anlegen'}
          </button>
        </form>
      </div>
    </div>
  )
}
