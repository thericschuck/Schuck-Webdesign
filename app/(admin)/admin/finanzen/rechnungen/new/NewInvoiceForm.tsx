'use client'

import { useActionState, useMemo, useState } from 'react'
import { createInvoiceDraftAction } from './actions'
import { ItemsEditor, EMPTY_ITEM, type ItemDraft, type ArticleOption } from '../ItemsEditor'

type State = { status: 'error'; message: string } | null

interface ClientOption {
  id: string
  display_name: string
  client_number: string | null
}

interface ProjectOption {
  id: string
  client_id: string
  title: string
  project_number: string | null
}

const inputClass =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full'

const labelClass = 'text-xs font-medium text-gray-500 mb-1 block'

export function NewInvoiceForm({
  clients,
  projects,
  articles,
}: {
  clients: ClientOption[]
  projects: ProjectOption[]
  articles: ArticleOption[]
}) {
  const [state, action, pending] = useActionState<State, FormData>(createInvoiceDraftAction, null)
  const [clientId, setClientId] = useState('')
  const [items, setItems] = useState<ItemDraft[]>([{ ...EMPTY_ITEM }])

  const clientProjects = useMemo(() => projects.filter((p) => p.client_id === clientId), [projects, clientId])
  const validItems = items.filter((it) => it.ep > 0 && (it.art_nr || it.bezeichnung))
  const total = validItems.reduce((sum, it) => sum + (it.menge || 0) * (it.ep || 0), 0)

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="items_json" value={JSON.stringify(validItems)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Kunde *</label>
          <select
            name="client_id"
            required
            disabled={pending}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={inputClass}
          >
            <option value="">— auswählen —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.client_number ? `${c.client_number} · ` : ''}
                {c.display_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Projekt (optional)</label>
          <select name="project_id" disabled={pending || !clientId} className={inputClass} defaultValue="">
            <option value="">— kein Projekt —</option>
            {clientProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_number ? `${p.project_number} · ` : ''}
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Leistungsdatum</label>
          <input name="service_date" type="date" disabled={pending} className={inputClass} />
        </div>
      </div>

      <ItemsEditor items={items} onChange={setItems} articles={articles} disabled={pending} />

      <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        Gesamt (netto): {total.toFixed(2)} €
      </p>

      {state?.status === 'error' && (
        <p className="text-sm text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !clientId || validItems.length === 0}
        className="self-start px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        {pending ? 'Speichern…' : 'Entwurf speichern'}
      </button>
    </form>
  )
}
