'use client'

export interface ItemDraft {
  art_nr?: string
  bezeichnung: string
  menge: number
  ep: number
}

export interface ArticleOption {
  art_nr: string
  bezeichnung: string
  preis_min: number | null
  preis_max: number | null
}

export const EMPTY_ITEM: ItemDraft = { bezeichnung: '', menge: 1, ep: 0 }

const inputClass =
  'rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full'

export function ItemsEditor({
  items,
  onChange,
  articles,
  disabled,
}: {
  items: ItemDraft[]
  onChange: (items: ItemDraft[]) => void
  articles: ArticleOption[]
  disabled?: boolean
}) {
  function updateItem(index: number, patch: Partial<ItemDraft>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  function handleArticleSelect(index: number, artNr: string) {
    const article = articles.find((a) => a.art_nr === artNr)
    updateItem(index, {
      art_nr: artNr || undefined,
      bezeichnung: article?.bezeichnung ?? '',
      ep: article?.preis_min ?? 0,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-12 sm:col-span-4">
            {index === 0 && <label className="text-xs text-gray-500 block mb-1">Artikel</label>}
            <select
              value={item.art_nr ?? ''}
              onChange={(e) => handleArticleSelect(index, e.target.value)}
              disabled={disabled}
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
              disabled={disabled}
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
              disabled={disabled}
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
              disabled={disabled}
              className={inputClass}
            />
          </div>
          <div className="col-span-2 sm:col-span-1 flex justify-end">
            <button
              type="button"
              disabled={disabled || items.length === 1}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
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
        onClick={() => onChange([...items, { ...EMPTY_ITEM }])}
        className="text-sm text-gray-600 hover:text-gray-900 self-start transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        + Position hinzufügen
      </button>
    </div>
  )
}
