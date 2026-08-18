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
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#7F77DD]/60 focus:ring-2 focus:ring-[#7F77DD]/20 transition-colors'

export type RenderMode = '2d' | '3d'

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
  renderMode,
  onRenderModeChange,
  onClose,
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
  renderMode: RenderMode
  onRenderModeChange: (mode: RenderMode) => void
  /** Nur auf Mobile gesetzt (Bottom-Sheet) — zeigt einen Schließen-Button, den das dauerhaft
   * offene Desktop-Panel nicht braucht. */
  onClose?: () => void
}) {
  return (
    <div className="w-full md:w-72 shrink-0 min-h-0 flex flex-col gap-5 bg-white/3 backdrop-blur-xl border border-white/8 border-t-white/12 rounded-t-2xl md:rounded-2xl shadow-2xl shadow-black/60 p-5 max-h-full overflow-y-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-playfair)' }}>
            System-Graph
          </h1>
          <p className="text-white/40 text-xs mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Explorativ — bearbeitet wird auf den Detailseiten.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="Schließen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div>
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
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
            className="px-3 py-2 bg-[#7F77DD] text-white text-sm font-medium rounded-lg hover:bg-[#8f88e8] transition-colors shrink-0"
          >
            →
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Fokus-Modus
        </h2>
        <select
          value={focusClientId ?? ''}
          onChange={(e) => onFocusChange(e.target.value || null)}
          className={inputClass}
        >
          <option value="" className="bg-[#111111]">Alle anzeigen</option>
          {clientOptions.map((c) => (
            <option key={c.id} value={c.id} className="bg-[#111111]">
              {c.label}
            </option>
          ))}
        </select>
        {focusClientId && (
          <button
            onClick={() => onFocusChange(null)}
            className="text-xs text-white/40 hover:text-white mt-1.5 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Zurücksetzen
          </button>
        )}
      </div>

      <div>
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Legende / Filter
        </h2>
        <div className="flex flex-col gap-1.5">
          {typeCounts.map(({ type, count }) => (
            <label
              key={type}
              className="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              <input
                type="checkbox"
                checked={visibleTypes.has(type)}
                onChange={() => onToggleType(type)}
                className="rounded accent-[#7F77DD]"
              />
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: colorForType(type), boxShadow: `0 0 6px ${colorForType(type)}` }}
              />
              <span className="flex-1 truncate">{labelForType(type)}</span>
              <span className="text-xs text-white/30">{count}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Ansicht
        </h2>
        <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
          <button
            onClick={() => onRenderModeChange('3d')}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              renderMode === '3d' ? 'bg-[#7F77DD] text-white' : 'text-white/50 hover:text-white'
            }`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            3D
          </button>
          <button
            onClick={() => onRenderModeChange('2d')}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              renderMode === '2d' ? 'bg-[#7F77DD] text-white' : 'text-white/50 hover:text-white'
            }`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            2D
          </button>
        </div>
      </div>

      {truncated && (
        <div className="mt-auto p-3 bg-amber-400/10 border border-amber-400/20 rounded-lg">
          <p className="text-xs text-amber-300" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Zeige {typeCounts.find((t) => t.type === 'lead')?.count ?? 0} von {totalCount} Leads (neueste zuerst) — alle
            anderen Daten sind vollständig geladen.
          </p>
        </div>
      )}
    </div>
  )
}
