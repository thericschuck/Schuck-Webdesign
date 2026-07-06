'use client'

import { useActionState } from 'react'
import { updateArticleAction } from '../actions'
import { KATEGORIE_ORDER, TYP_OPTIONS } from '../category-constants'
import type { Article } from '@/types/database'

type State = { status: 'error'; message: string } | { status: 'success' } | null

const inputClass =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full'

const labelClass = 'text-xs font-medium text-gray-500 mb-1 block'

export function ArticleEditForm({
  article,
  otherArticles,
}: {
  article: Article
  otherArticles: { art_nr: string; bezeichnung: string }[]
}) {
  const boundAction = updateArticleAction.bind(null, article.art_nr)
  const [state, action, pending] = useActionState<State, FormData>(boundAction, null)

  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className={labelClass}>Bezeichnung *</label>
        <input name="bezeichnung" required disabled={pending} defaultValue={article.bezeichnung} className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Beschreibung</label>
        <textarea
          name="beschreibung"
          rows={3}
          disabled={pending}
          defaultValue={article.beschreibung ?? ''}
          className={`${inputClass} resize-none`}
        />
      </div>
      <div>
        <label className={labelClass}>Preis min. (€)</label>
        <input
          name="preis_min"
          type="number"
          step="0.01"
          disabled={pending}
          defaultValue={article.preis_min ?? ''}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Preis max. (€)</label>
        <input
          name="preis_max"
          type="number"
          step="0.01"
          disabled={pending}
          defaultValue={article.preis_max ?? ''}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Einheit</label>
        <input name="einheit" disabled={pending} defaultValue={article.einheit ?? ''} className={inputClass} placeholder="z.B. Monatlich, Einmalig" />
      </div>
      <div>
        <label className={labelClass}>Typ</label>
        <input name="typ" list="typ-options" disabled={pending} defaultValue={article.typ ?? ''} className={inputClass} />
        <datalist id="typ-options">
          {TYP_OPTIONS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>
      <div>
        <label className={labelClass}>Kategorie</label>
        <select name="kategorie" disabled={pending} defaultValue={article.kategorie ?? ''} className={inputClass}>
          <option value="">— keine —</option>
          {KATEGORIE_ORDER.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Pflichtbetrieb-Kopplung</label>
        <select
          name="pflichtbetrieb_art_nr"
          disabled={pending}
          defaultValue={article.pflichtbetrieb_art_nr ?? ''}
          className={inputClass}
        >
          <option value="">— keiner —</option>
          {otherArticles.map((a) => (
            <option key={a.art_nr} value={a.art_nr}>
              {a.art_nr} · {a.bezeichnung}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="flex items-center gap-2 text-sm text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          <input type="checkbox" name="aktiv" defaultChecked={article.aktiv} disabled={pending} />
          Aktiv (im Katalog sichtbar)
        </label>
      </div>

      {state?.status === 'error' && (
        <p className="text-sm text-red-600 sm:col-span-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {state.message}
        </p>
      )}
      {state?.status === 'success' && (
        <p className="text-sm text-green-600 sm:col-span-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Gespeichert.
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {pending ? 'Speichern…' : 'Speichern'}
        </button>
      </div>
    </form>
  )
}
