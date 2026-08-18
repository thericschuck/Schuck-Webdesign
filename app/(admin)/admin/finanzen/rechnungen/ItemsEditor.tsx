'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export interface ItemDraft {
  art_nr?: string
  pkt_nr?: string
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

export interface PackageOption {
  pkt_nr: string
  paketname: string
  paketpreis: number | null
}

export const EMPTY_ITEM: ItemDraft = { bezeichnung: '', menge: 1, ep: 0 }

/** Eine Zeile zählt, sobald ein Artikel/Paket verknüpft ist oder eine Bezeichnung
 * eingetragen wurde — bewusst NICHT mehr an "ep > 0" gekoppelt. Der alte Filter hat
 * Rabattzeilen (negativer EP) und echte 0€-Positionen beim Absenden stillschweigend
 * verschluckt. */
export function isSubstantiveItem(item: ItemDraft): boolean {
  return Boolean(item.art_nr) || Boolean(item.pkt_nr) || item.bezeichnung.trim().length > 0
}

function fmtEuro(value: number | null) {
  return value == null ? '—' : `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

const inputClass =
  'rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full'

// ── Kombinierte, durchsuchbare Artikel-/Paket-Auswahl ───────────────────────

type ProductOption = {
  key: string
  kind: 'article' | 'package'
  artNr?: string
  pktNr?: string
  label: string
  sublabel: string
  price: number | null
}

function buildOptions(articles: ArticleOption[], packages: PackageOption[]): ProductOption[] {
  return [
    ...articles.map((a) => ({
      key: `a:${a.art_nr}`,
      kind: 'article' as const,
      artNr: a.art_nr,
      label: a.bezeichnung,
      sublabel: a.art_nr,
      price: a.preis_min,
    })),
    ...packages.map((p) => ({
      key: `p:${p.pkt_nr}`,
      kind: 'package' as const,
      pktNr: p.pkt_nr,
      label: p.paketname,
      sublabel: `Paket · ${p.pkt_nr}`,
      price: p.paketpreis,
    })),
  ]
}

function ArticlePicker({
  item,
  options,
  disabled,
  onPick,
}: {
  item: ItemDraft
  options: ProductOption[]
  disabled?: boolean
  onPick: (option: ProductOption | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const current = options.find((o) => (item.art_nr && o.artNr === item.art_nr) || (item.pkt_nr && o.pktNr === item.pkt_nr))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.sublabel.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  function openPicker() {
    if (disabled) return
    setOpen(true)
    setQuery('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function pick(option: ProductOption | null) {
    onPick(option)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      {open ? (
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false)
              setQuery('')
            }
          }}
          placeholder="Artikel oder Paket suchen…"
          className={inputClass}
        />
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className={`${inputClass} text-left truncate ${current ? 'text-gray-900' : 'text-gray-400'}`}
        >
          {current ? current.label : 'Frei (Custom-Position)'}
        </button>
      )}

      {open && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-20 mt-1 w-88 max-w-[90vw] max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg custom-scrollbar"
        >
          <button
            type="button"
            onClick={() => pick(null)}
            className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-100"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Frei (Custom-Position)
          </button>
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Keine Treffer für „{query}&quot;.
            </p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => pick(o)}
                className="w-full flex items-center justify-between gap-3 text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                <span className="min-w-0">
                  <span className="block text-gray-900 leading-snug wrap-break-word">{o.label}</span>
                  <span className="block text-xs text-gray-400 truncate">{o.sublabel}</span>
                </span>
                <span className="shrink-0 flex items-center gap-2">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      o.kind === 'package' ? 'bg-violet-50 text-violet-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {o.kind === 'package' ? 'Paket' : 'Artikel'}
                  </span>
                  <span className="text-xs text-gray-500 tabular-nums">{fmtEuro(o.price)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Editor ───────────────────────────────────────────────────────────────────

export function ItemsEditor({
  items,
  onChange,
  articles,
  packages = [],
  disabled,
}: {
  items: ItemDraft[]
  onChange: (items: ItemDraft[]) => void
  articles: ArticleOption[]
  packages?: PackageOption[]
  disabled?: boolean
}) {
  const options = useMemo(() => buildOptions(articles, packages), [articles, packages])

  function updateItem(index: number, patch: Partial<ItemDraft>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  function handlePick(index: number, option: ProductOption | null) {
    if (!option) {
      updateItem(index, { art_nr: undefined, pkt_nr: undefined })
      return
    }
    updateItem(index, {
      art_nr: option.artNr,
      pkt_nr: option.pktNr,
      bezeichnung: option.label,
      ep: option.price ?? 0,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => {
        const gesamt = (item.menge || 0) * (item.ep || 0)
        return (
          <div key={index} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12 sm:col-span-4">
              {index === 0 && <label className="text-xs text-gray-500 block mb-1">Artikel / Paket</label>}
              <ArticlePicker item={item} options={options} disabled={disabled} onPick={(o) => handlePick(index, o)} />
            </div>
            <div className="col-span-12 sm:col-span-2">
              {index === 0 && <label className="text-xs text-gray-500 block mb-1">Bezeichnung</label>}
              <input
                value={item.bezeichnung}
                onChange={(e) => updateItem(index, { bezeichnung: e.target.value })}
                disabled={disabled}
                placeholder="Bezeichnung"
                className={inputClass}
              />
            </div>
            <div className="col-span-4 sm:col-span-1">
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
            <div className="col-span-4 sm:col-span-2">
              {index === 0 && <label className="text-xs text-gray-500 block mb-1">EP (€) — negativ = Rabatt</label>}
              <input
                type="number"
                step="0.01"
                value={item.ep}
                onChange={(e) => updateItem(index, { ep: Number(e.target.value) })}
                disabled={disabled}
                placeholder="z.B. -50"
                className={inputClass}
              />
            </div>
            <div className="col-span-3 sm:col-span-2">
              {index === 0 && <label className="text-xs text-gray-500 block mb-1">Gesamt</label>}
              <p
                className={`px-2.5 py-2 text-sm text-right tabular-nums ${gesamt < 0 ? 'text-red-600' : 'text-gray-600'}`}
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {fmtEuro(gesamt)}
              </p>
            </div>
            <div className="col-span-1 flex justify-end pb-2">
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
        )
      })}

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
