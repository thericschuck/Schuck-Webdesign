'use client'

import { colorForType, labelForType } from './types'

export interface TypeCount {
  type: string
  count: number
}

export interface ClientOption {
  id: string
  label: string
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white'

export function FilterPanel({
  typeCounts,
  visibleTypes,
  onToggleType,
  search,
  onSearchChange,
  onSearchSubmit,
  clientOptions,
  focusClientId,
  onFocusChange,
  totalCount,
  truncated,
}: {
  typeCounts: TypeCount[]
  visibleTypes: Set<string>
  onToggleType: (type: string) => void
  search: string
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  clientOptions: ClientOption[]
  focusClientId: string | null
  onFocusChange: (clientId: string | null) => void
  totalCount: number
  truncated: boolean
}) {
  return (
    <div className="w-64 shrink-0 flex flex-col gap-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-full overflow-y-auto">
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Suche
        </h2>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
            placeholder="Knoten suchen…"
            className={inputClass}
          />
          <button
            onClick={onSearchSubmit}
            className="px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors shrink-0"
          >
            →
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Fokus-Modus
        </h2>
        <select
          value={focusClientId ?? ''}
          onChange={(e) => onFocusChange(e.target.value || null)}
          className={inputClass}
        >
          <option value="">Alle anzeigen</option>
          {clientOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {focusClientId && (
          <button
            onClick={() => onFocusChange(null)}
            className="text-xs text-gray-500 hover:text-gray-900 mt-1.5 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Zurücksetzen
          </button>
        )}
      </div>

      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Legende / Filter
        </h2>
        <div className="flex flex-col gap-1.5">
          {typeCounts.map(({ type, count }) => (
            <label
              key={type}
              className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              <input
                type="checkbox"
                checked={visibleTypes.has(type)}
                onChange={() => onToggleType(type)}
                className="rounded"
              />
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorForType(type) }} />
              <span className="flex-1 truncate">{labelForType(type)}</span>
              <span className="text-xs text-gray-400">{count}</span>
            </label>
          ))}
        </div>
      </div>

      {truncated && (
        <div className="mt-auto p-3 bg-amber-50 border border-amber-100 rounded-lg">
          <p className="text-xs text-amber-800" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {totalCount} Entitäten insgesamt — nur Kunden/Projekte initial geladen. Auf einen Knoten klicken, um dessen
            Nachbarschaft nachzuladen.
          </p>
        </div>
      )}
    </div>
  )
}
