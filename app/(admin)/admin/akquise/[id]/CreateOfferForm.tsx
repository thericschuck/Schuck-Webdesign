'use client'

import { useActionState, useEffect, useState } from 'react'
import { createOfferAction } from './actions'

export interface ArticleOption {
  art_nr: string
  bezeichnung: string
  preis_min: number | null
  preis_max: number | null
}

interface Item {
  art_nr?: string
  bezeichnung: string
  menge: number
  ep: number
}

type State = { status: 'error'; message: string } | { status: 'success'; offerNumber: string } | null

const inputClass =
  'rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full'

const EMPTY_ITEM: Item = { bezeichnung: '', menge: 1, ep: 0 }

export function CreateOfferForm({ leadId, articles }: { leadId: string; articles: ArticleOption[] }) {
  const boundAction = createOfferAction.bind(null, leadId)
  const [state, action, pending] = useActionState<State, FormData>(boundAction, null)
  const [items, setItems] = useState<Item[]>([{ ...EMPTY_ITEM }])

  useEffect(() => {
    if (state?.status === 'success') {
      setItems([{ ...EMPTY_ITEM }])
    }
  }, [state])

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  function handleArticleSelect(index: number, artNr: string) {
    const article = articles.find((a) => a.art_nr === artNr)
    updateItem(index, {
      art_nr: artNr || undefined,
      bezeichnung: article?.bezeichnung ?? '',
      ep: article?.preis_min ?? 0,
    })
  }

  const validItems = items.filter((it) => it.ep > 0 && (it.art_nr || it.bezeichnung))
  const total = validItems.reduce((sum, it) => sum + (it.menge || 0) * (it.ep || 0), 0)

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="items_json" value={JSON.stringify(validItems)} />

      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-12 sm:col-span-4">
            {index === 0 && <label className="text-xs text-gray-500 block mb-1">Artikel</label>}
            <select
              value={item.art_nr ?? ''}
              onChange={(e) => handleArticleSelect(index, e.target.value)}
              disabled={pending}
              className={inputClass}
            >
              <option value="">Frei (Custom-Position)</option>
              {articles.map((a) => (
                <option key={a.art_nr} value={a.art_nr}>
                  {a.art_nr} — {a.bezeichnung}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-12 sm:col-span-4">
            {index === 0 && <label className="text-xs text-gray-500 block mb-1">Bezeichnung</label>}
            <input
              value={item.bezeichnung}
              onChange={(e) => updateItem(index, { bezeichnung: e.target.value })}
              disabled={pending}
              placeholder="Bezeichnung"
              className={inputClass}
            />
          </div>
          <div className="col-span-4 sm:col-span-2">
            {index === 0 && <label className="text-xs text-gray-500 block mb-1">Menge</label>}
            <input
              type="number"
              min={1}
              value={item.menge}
              onChange={(e) => updateItem(index, { menge: Number(e.target.value) })}
              disabled={pending}
              className={inputClass}
            />
          </div>
          <div className="col-span-6 sm:col-span-1">
            {index === 0 && <label className="text-xs text-gray-500 block mb-1">EP (€)</label>}
            <input
              type="number"
              step="0.01"
              value={item.ep}
              onChange={(e) => updateItem(index, { ep: Number(e.target.value) })}
              disabled={pending}
              className={inputClass}
            />
          </div>
          <div className="col-span-2 sm:col-span-1 flex justify-end">
            <button
              type="button"
              disabled={pending || items.length === 1}
              onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
              className="text-red-400 hover:text-red-600 text-sm disabled:opacity-30"
              aria-label="Position entfernen"
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}
        className="text-sm text-gray-600 hover:text-gray-900 self-start transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        + Position hinzufügen
      </button>

      <div className="max-w-[200px]">
        <label className="text-xs text-gray-500 block mb-1">Gültig bis</label>
        <input name="valid_until" type="date" disabled={pending} className={inputClass} />
      </div>

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
          Angebot {state.offerNumber} erstellt.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || validItems.length === 0}
        className="self-start px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        {pending ? 'Erstellen…' : 'Angebot erstellen'}
      </button>
    </form>
  )
}
