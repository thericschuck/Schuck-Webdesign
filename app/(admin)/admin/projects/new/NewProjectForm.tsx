'use client'

import { useActionState } from 'react'
import { createProject } from './actions'

type State = { status: 'error'; message: string } | null

type Props = {
  clients: { id: string; company_name: string }[]
  preselectedClientId?: string
}

const STATUS_OPTIONS = [
  { value: 'briefing', label: 'Briefing' },
  { value: 'design', label: 'Design' },
  { value: 'development', label: 'Entwicklung' },
  { value: 'review', label: 'Review' },
  { value: 'live', label: 'Live' },
]

export function NewProjectForm({ clients, preselectedClientId }: Props) {
  const [state, action, pending] = useActionState<State, FormData>(createProject, null)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <form action={action} className="flex flex-col gap-5">
        {/* Kunde */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="client_id" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Kunde <span className="text-red-500">*</span>
          </label>
          <select
            id="client_id"
            name="client_id"
            required
            defaultValue={preselectedClientId ?? ''}
            disabled={pending}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 bg-white transition-colors"
          >
            <option value="" disabled>Kunden auswählen…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
        </div>

        {/* Titel */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Projekttitel <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="z.B. Website Relaunch 2025"
            disabled={pending}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors"
          />
        </div>

        {/* Beschreibung */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Beschreibung
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Kurze Projektbeschreibung…"
            disabled={pending}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 resize-none transition-colors"
          />
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue="briefing"
            disabled={pending}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 bg-white transition-colors"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="start_date" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Startdatum
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              disabled={pending}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="launch_date" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Launch-Datum
            </label>
            <input
              id="launch_date"
              name="launch_date"
              type="date"
              disabled={pending}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors"
            />
          </div>
        </div>

        {state?.status === 'error' && (
          <p className="text-sm text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-gray-900 text-white text-sm font-semibold rounded-xl py-3 hover:bg-gray-700 disabled:opacity-50 transition-colors mt-1"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {pending ? 'Projekt anlegen…' : 'Projekt anlegen'}
        </button>
      </form>
    </div>
  )
}
