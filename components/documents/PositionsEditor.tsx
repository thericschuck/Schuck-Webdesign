'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { LEERE_POSITION, type PositionDraft } from './editor-types'

/**
 * Positionsliste des Dokument-Editors.
 *
 * Gegenüber dem alten `ItemsEditor` erweitert um mehrzeilige Beschreibung und
 * die drei Sonderfelder (Einzelpreis-/Betrags-Label, Summenausschluss) aus
 * Migration 0036. Die Sonderfelder sind eingeklappt hinter „Sonderfall" — sie
 * werden selten gebraucht und würden die Zeile sonst unlesbar machen.
 */

const FONT = { fontFamily: 'var(--font-dm-sans)' } as const

const inputClass =
  'rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full'

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

function fmtEuro(value: number | null) {
  return value == null
    ? '—'
    : `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

// ── Katalog-Auswahl ─────────────────────────────────────────────────────────

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

function ProduktPicker({
  position,
  options,
  disabled,
  onPick,
}: {
  position: PositionDraft
  options: ProductOption[]
  disabled?: boolean
  onPick: (option: ProductOption | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const current = options.find(
    (o) => (position.art_nr && o.artNr === position.art_nr) || (position.pkt_nr && o.pktNr === position.pkt_nr)
  )

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
          style={FONT}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            if (disabled) return
            setOpen(true)
            setQuery('')
            requestAnimationFrame(() => inputRef.current?.focus())
          }}
          disabled={disabled}
          className={`${inputClass} text-left truncate ${current ? 'text-gray-900' : 'text-gray-400'}`}
          style={FONT}
        >
          {current ? current.label : 'Aus Katalog wählen…'}
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
            style={FONT}
          >
            Freie Position (kein Katalogartikel)
          </button>
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-xs text-gray-400" style={FONT}>
              Keine Treffer für „{query}&quot;.
            </p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => pick(o)}
                className="w-full flex items-center justify-between gap-3 text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                style={FONT}
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

// ── Positionsliste ──────────────────────────────────────────────────────────

export function PositionsEditor({
  positionen,
  articles,
  packages,
  disabled,
  onChange,
}: {
  positionen: PositionDraft[]
  articles: ArticleOption[]
  packages: PackageOption[]
  disabled?: boolean
  onChange: (positionen: PositionDraft[]) => void
}) {
  const options = useMemo(() => buildOptions(articles, packages), [articles, packages])
  const [offeneSonderfaelle, setOffeneSonderfaelle] = useState<Set<number>>(new Set())

  function patch(index: number, changes: Partial<PositionDraft>) {
    onChange(positionen.map((p, i) => (i === index ? { ...p, ...changes } : p)))
  }

  function entfernen(index: number) {
    const rest = positionen.filter((_, i) => i !== index)
    onChange(rest.length > 0 ? rest : [{ ...LEERE_POSITION }])
  }

  function verschieben(index: number, richtung: -1 | 1) {
    const ziel = index + richtung
    if (ziel < 0 || ziel >= positionen.length) return
    const kopie = [...positionen]
    ;[kopie[index], kopie[ziel]] = [kopie[ziel], kopie[index]]
    onChange(kopie)
  }

  function sonderfallUmschalten(index: number) {
    setOffeneSonderfaelle((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function katalogGewaehlt(index: number, option: ProductOption | null) {
    if (!option) {
      patch(index, { art_nr: undefined, pkt_nr: undefined })
      return
    }
    patch(index, {
      art_nr: option.artNr,
      pkt_nr: option.pktNr,
      // Bezeichnung nur übernehmen, wenn noch nichts Eigenes drinsteht —
      // sonst überschreibt die Katalogauswahl einen angepassten Text.
      bezeichnung: positionen[index].bezeichnung.trim() || option.label,
      ep: positionen[index].ep || (option.price ?? 0),
    })
  }

  return (
    // Positionen als Zeilen mit Trennlinien statt als einzeln gerahmte Kästen —
    // bei fünf Positionen ergab das vorher fünf verschachtelte Boxen in einer Box.
    <div className="flex flex-col">
      {positionen.map((position, index) => {
        const sonderfallOffen = offeneSonderfaelle.has(index)
        const zeilensumme = (position.menge || 0) * (position.ep || 0)

        return (
          <div
            key={index}
            className={`flex flex-col gap-2.5 py-4 ${index > 0 ? 'border-t border-gray-100' : 'pt-0'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-gray-400" style={FONT}>
                Position {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => verschieben(index, -1)}
                  disabled={disabled || index === 0}
                  className="p-1 text-gray-300 hover:text-gray-700 disabled:opacity-30 transition-colors"
                  aria-label="Nach oben"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => verschieben(index, 1)}
                  disabled={disabled || index === positionen.length - 1}
                  className="p-1 text-gray-300 hover:text-gray-700 disabled:opacity-30 transition-colors"
                  aria-label="Nach unten"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => entfernen(index)}
                  disabled={disabled}
                  className="p-1 text-gray-300 hover:text-red-600 disabled:opacity-30 transition-colors"
                  aria-label="Position entfernen"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <ProduktPicker
              position={position}
              options={options}
              disabled={disabled}
              onPick={(option) => katalogGewaehlt(index, option)}
            />

            <input
              value={position.bezeichnung}
              onChange={(e) => patch(index, { bezeichnung: e.target.value })}
              disabled={disabled}
              placeholder="Bezeichnung"
              className={inputClass}
              style={FONT}
            />

            <textarea
              value={position.beschreibung}
              onChange={(e) => patch(index, { beschreibung: e.target.value })}
              disabled={disabled}
              rows={2}
              placeholder="Beschreibung (optional, mehrzeilig)"
              className={`${inputClass} resize-y min-h-16`}
              style={FONT}
            />

            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-400" style={FONT}>
                  Menge
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={position.menge}
                  onChange={(e) => patch(index, { menge: Number(e.target.value) })}
                  disabled={disabled}
                  className={inputClass}
                  style={FONT}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-400" style={FONT}>
                  Einzelpreis €
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={position.ep}
                  onChange={(e) => patch(index, { ep: Number(e.target.value) })}
                  disabled={disabled}
                  className={inputClass}
                  style={FONT}
                />
              </label>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-400" style={FONT}>
                  Gesamt
                </span>
                <div
                  className={`px-2.5 py-2 text-sm tabular-nums ${
                    position.excludeFromSum ? 'text-gray-400 line-through' : 'text-gray-900'
                  }`}
                  style={FONT}
                >
                  {fmtEuro(zeilensumme)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => sonderfallUmschalten(index)}
              className="self-start text-xs text-gray-400 hover:text-gray-700 transition-colors"
              style={FONT}
            >
              {sonderfallOffen ? '− Sonderfall ausblenden' : '+ Sonderfall (Abo, Rabatt, Festtext)'}
            </button>

            {sonderfallOffen && (
              <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-2.5">
                <p className="text-[11px] text-gray-400 leading-relaxed" style={FONT}>
                  Für laufende Positionen wie Care-Abos: eigener Text in der Preisspalte, „–“ als Betrag, und die
                  Zeile bleibt aus der Summe raus.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={position.epLabel}
                    onChange={(e) => patch(index, { epLabel: e.target.value })}
                    disabled={disabled}
                    placeholder="Text statt Einzelpreis"
                    className={inputClass}
                    style={FONT}
                  />
                  <input
                    value={position.betragLabel}
                    onChange={(e) => patch(index, { betragLabel: e.target.value })}
                    disabled={disabled}
                    placeholder="Text statt Betrag"
                    className={inputClass}
                    style={FONT}
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-600" style={FONT}>
                  <input
                    type="checkbox"
                    checked={position.excludeFromSum}
                    onChange={(e) => patch(index, { excludeFromSum: e.target.checked })}
                    disabled={disabled}
                    className="rounded border-gray-300"
                  />
                  Nicht in die Gesamtsumme einrechnen
                </label>
              </div>
            )}
          </div>
        )
      })}

      <button
        type="button"
        onClick={() => onChange([...positionen, { ...LEERE_POSITION }])}
        disabled={disabled}
        className="self-start inline-flex items-center gap-1.5 pt-4 border-t border-gray-100 w-full text-sm font-medium text-gray-500 hover:text-gray-900 disabled:opacity-50 transition-colors"
        style={FONT}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Position hinzufügen
      </button>
    </div>
  )
}
