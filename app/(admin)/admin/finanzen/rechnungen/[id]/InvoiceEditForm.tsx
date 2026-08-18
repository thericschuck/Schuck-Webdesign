'use client'

import { useActionState, useState } from 'react'
import { updateInvoiceDraftAction } from './actions'
import { ItemsEditor, isSubstantiveItem, type ItemDraft, type ArticleOption, type PackageOption } from '../ItemsEditor'

interface ProjectOption {
  id: string
  title: string
  project_number: string | null
}

type State = { status: 'error'; message: string } | { status: 'success' } | null

const inputClass =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full'

const labelClass = 'text-xs font-medium text-gray-500 mb-1 block'

export function InvoiceEditForm({
  invoiceId,
  initialItems,
  serviceDate,
  projectId,
  projects,
  articles,
  packages,
}: {
  invoiceId: string
  initialItems: ItemDraft[]
  serviceDate: string | null
  projectId: string | null
  projects: ProjectOption[]
  articles: ArticleOption[]
  packages: PackageOption[]
}) {
  const boundAction = updateInvoiceDraftAction.bind(null, invoiceId)
  const [state, action, pending] = useActionState<State, FormData>(boundAction, null)
  const [items, setItems] = useState<ItemDraft[]>(initialItems)

  const validItems = items.filter(isSubstantiveItem)
  const total = validItems.reduce((sum, it) => sum + (it.menge || 0) * (it.ep || 0), 0)

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="items_json" value={JSON.stringify(validItems)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Projekt (optional)</label>
          <select name="project_id" disabled={pending} defaultValue={projectId ?? ''} className={inputClass}>
            <option value="">— kein Projekt —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_number ? `${p.project_number} · ` : ''}
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Leistungsdatum</label>
          <input name="service_date" type="date" disabled={pending} defaultValue={serviceDate ?? ''} className={inputClass} />
        </div>
      </div>

      <ItemsEditor items={items} onChange={setItems} articles={articles} packages={packages} disabled={pending} />

      <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        Gesamt (netto): {total.toFixed(2)} €
      </p>

      {state?.status === 'error' && (
        <p className="text-sm text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {state.message}
        </p>
      )}
      {state?.status === 'success' && (
        <p className="text-sm text-green-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Gespeichert.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || validItems.length === 0}
        className="self-start px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        {pending ? 'Speichern…' : 'Entwurf speichern'}
      </button>
    </form>
  )
}
