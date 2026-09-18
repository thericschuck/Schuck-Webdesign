'use client'

import { useMemo, useRef, useState } from 'react'
import { useToast } from '@/components/admin/ToastProvider'

const dmSans = { fontFamily: 'var(--font-dm-sans)' }
const monoInputClass =
  'w-full min-w-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-mono outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50'

export interface VariableRow {
  key: string
  value: string
}

// ── Icons ────────────────────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18M10.584 10.587a2 2 0 002.828 2.83M9.363 5.365A9.466 9.466 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411M6.423 6.423C4.462 7.79 3.06 9.75 2.458 12c.639 2.35 2.098 4.363 4.02 5.657"
      />
    </svg>
  )
}
function UploadIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M17 8l-5-5-5 5M12 3v12" />
    </svg>
  )
}
function AlertIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-1.5a9 9 0 11-18 0 9 9 0 0118 0zM12 15.75h.007" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
    </svg>
  )
}

// ── .env Parsing ─────────────────────────────────────────────────────────

/** Versteht KEY=VALUE, `export KEY=VALUE`, "-/'-gequotete Werte und # Kommentare/Leerzeilen (übersprungen). */
export function parseEnvText(text: string): VariableRow[] {
  const rows: VariableRow[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const withoutExport = line.replace(/^export\s+/, '')
    const eq = withoutExport.indexOf('=')
    if (eq === -1) continue
    const key = withoutExport.slice(0, eq).trim()
    let value = withoutExport.slice(eq + 1).trim()
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1)
    }
    if (key) rows.push({ key, value })
  }
  return rows
}

function duplicateKeys(rows: { key: string }[]): Set<string> {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const r of rows) {
    const key = r.key.trim()
    if (!key) continue
    if (seen.has(key)) dupes.add(key)
    seen.add(key)
  }
  return dupes
}

let rowIdCounter = 0

// ── Editor (Anlegen/Bearbeiten) ─────────────────────────────────────────

/** Uncontrolled Zeilen (defaultValue) — die Werte selbst gehen als FormData (var_key/var_value) raus,
 * React-State steuert nur, wie viele Zeilen es gibt und womit sie vorbefüllt starten. Beim Import aus
 * Text/Datei wird der State neu gesetzt, wodurch alle Inputs über `key`-Remount neu befüllt werden. */
export function EnvVariablesEditor({ initialVariables, disabled }: { initialVariables?: VariableRow[]; disabled?: boolean }) {
  const [rows, setRows] = useState(() =>
    (initialVariables && initialVariables.length > 0 ? initialVariables : [{ key: '', value: '' }]).map((v) => ({
      id: rowIdCounter++,
      ...v,
    }))
  )
  const [revealAll, setRevealAll] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const dragCounter = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  const dupes = useMemo(() => duplicateKeys(rows), [rows])

  const addRow = () => setRows((r) => [...r, { id: rowIdCounter++, key: '', value: '' }])
  const removeRow = (id: number) => setRows((r) => (r.length > 1 ? r.filter((row) => row.id !== id) : r))
  const updateRow = (id: number, patch: Partial<VariableRow>) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)))

  const importRows = (parsed: VariableRow[]) => {
    if (parsed.length === 0) {
      showToast('Keine gültigen KEY=VALUE-Zeilen gefunden.', 'error')
      return
    }
    setRows((current) => {
      const next = current
        .filter((r) => r.key.trim() !== '' || r.value.trim() !== '')
        .map((r) => ({ ...r }))
      for (const p of parsed) {
        const existing = next.find((r) => r.key === p.key)
        if (existing) existing.value = p.value
        else next.push({ id: rowIdCounter++, key: p.key, value: p.value })
      }
      return next.length > 0 ? next : [{ id: rowIdCounter++, key: '', value: '' }]
    })
    showToast(`${parsed.length} Variable${parsed.length === 1 ? '' : 'n'} übernommen.`)
    setImportText('')
    setImportOpen(false)
  }

  const handleFileSelect = async (file: File) => {
    const text = await file.text()
    importRows(parseEnvText(text))
  }

  // Wie bei Vercel: die ganze .env-Datei per Drag & Drop irgendwo auf den Editor
  // ziehen — ein Zähler statt eines einzelnen Booleans, weil verschachtelte Kind-
  // elemente sonst bei jedem dragenter/dragleave-Wechsel kurz flackern würden.
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    if (!e.dataTransfer.types.includes('Files')) return
    dragCounter.current++
    setDragActive(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = Math.max(0, dragCounter.current - 1)
    if (dragCounter.current === 0) setDragActive(false)
  }
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }

  // Wie bei Vercel: den gesamten Inhalt einer .env-Datei direkt in ein Key- oder
  // Value-Feld pasten, statt erst den Import-Dialog öffnen zu müssen — eine
  // mehrzeilige Zwischenablage wird als .env erkannt und in Zeilen aufgeteilt.
  const handleRowPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (!text.includes('\n')) return
    const parsed = parseEnvText(text)
    if (parsed.length === 0) return
    e.preventDefault()
    importRows(parsed)
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative flex flex-col gap-2.5 rounded-xl transition-colors ${dragActive ? 'ring-2 ring-gray-900 ring-offset-2' : ''}`}
    >
      {dragActive && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/90 border-2 border-dashed border-gray-400 pointer-events-none">
          <p className="flex items-center gap-2 text-sm font-medium text-gray-600" style={dmSans}>
            <UploadIcon /> .env-Datei hier ablegen…
          </p>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-500" style={dmSans}>
          {rows.filter((r) => r.key.trim()).length} Variable{rows.filter((r) => r.key.trim()).length === 1 ? '' : 'n'}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setRevealAll((v) => !v)}
            disabled={disabled}
            title={revealAll ? 'Werte verbergen' : 'Werte anzeigen'}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-50 transition-colors rounded-lg hover:bg-gray-50"
            style={dmSans}
          >
            {revealAll ? <EyeOffIcon /> : <EyeIcon />}
            <span className="hidden sm:inline">{revealAll ? 'Verbergen' : 'Anzeigen'}</span>
          </button>
          <button
            type="button"
            onClick={() => setImportOpen((v) => !v)}
            disabled={disabled}
            title="Aus .env-Datei oder Text importieren"
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium disabled:opacity-50 transition-colors rounded-lg ${
              importOpen ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
            style={dmSans}
          >
            <UploadIcon />
            <span className="hidden sm:inline">Importieren</span>
          </button>
        </div>
      </div>

      {importOpen && (
        <div className="flex flex-col gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
          <input
            ref={fileInputRef}
            type="file"
            accept=".env,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="self-start flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            style={dmSans}
          >
            <UploadIcon /> .env-Datei wählen
          </button>
          <p className="text-xs text-gray-400" style={dmSans}>
            …oder Inhalt einfügen (bestehende Keys werden aktualisiert, neue ergänzt):
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={4}
            placeholder={'API_KEY=sk-xxxx\nDATABASE_URL="postgres://…"\n# Kommentare werden ignoriert'}
            className={`${monoInputClass} resize-y`}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setImportOpen(false)
                setImportText('')
              }}
              className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              style={dmSans}
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={() => importRows(parseEnvText(importText))}
              disabled={!importText.trim()}
              className="px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
              style={dmSans}
            >
              Übernehmen
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {rows.map((row) => {
          const isDupe = row.key.trim() !== '' && dupes.has(row.key.trim())
          return (
            <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[9rem_1fr_auto] gap-1.5 items-center">
              <input
                name="var_key"
                defaultValue={row.key}
                onChange={(e) => updateRow(row.id, { key: e.target.value })}
                onBlur={(e) => {
                  const cleaned = e.target.value.trim()
                  if (cleaned && cleaned !== e.target.value) {
                    e.target.value = cleaned
                    updateRow(row.id, { key: cleaned })
                  }
                }}
                onPaste={handleRowPaste}
                disabled={disabled}
                placeholder="KEY"
                className={`${monoInputClass} font-medium ${isDupe ? 'border-amber-400 focus:border-amber-500 bg-amber-50' : ''}`}
              />
              <div className="flex items-center gap-1 min-w-0">
                <input
                  name="var_value"
                  type={revealAll ? 'text' : 'password'}
                  defaultValue={row.value}
                  onChange={(e) => updateRow(row.id, { value: e.target.value })}
                  onPaste={handleRowPaste}
                  disabled={disabled}
                  placeholder="Wert"
                  autoComplete="off"
                  className={monoInputClass}
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={disabled || rows.length === 1}
                title="Entfernen"
                className="shrink-0 w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-300 transition-colors"
              >
                ×
              </button>
              {isDupe && (
                <p className="sm:col-start-1 sm:col-span-2 -mt-1 flex items-center gap-1 text-xs text-amber-600" style={dmSans}>
                  <AlertIcon /> Doppelter Key
                </p>
              )}
            </div>
          )
        })}
      </div>
      <button
        type="button"
        onClick={addRow}
        disabled={disabled}
        className="self-start text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-50 transition-colors"
        style={dmSans}
      >
        + Variable hinzufügen
      </button>
    </div>
  )
}

// ── Tabelle (Ansicht, bereits entschlüsselt) ────────────────────────────

export function EnvVariablesTable({
  variables,
  copiedField,
  onCopyValue,
}: {
  variables: VariableRow[]
  copiedField: string | null
  onCopyValue: (value: string, field: string) => void
}) {
  const [search, setSearch] = useState('')
  const [revealedRows, setRevealedRows] = useState<Set<number>>(new Set())

  const toggleRow = (i: number) =>
    setRevealedRows((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  const allRevealed = revealedRows.size === variables.length && variables.length > 0
  const toggleAll = () => setRevealedRows(allRevealed ? new Set() : new Set(variables.map((_, i) => i)))

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return variables.map((v, i) => ({ ...v, index: i }))
    return variables.map((v, i) => ({ ...v, index: i })).filter((v) => v.key.toLowerCase().includes(q))
  }, [variables, search])

  if (variables.length === 0) {
    return (
      <p className="text-xs text-gray-400" style={dmSans}>
        Keine Variablen.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {variables.length > 6 && (
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Key suchen…"
              className="w-full rounded-lg border border-gray-200 pl-7 pr-2.5 py-1.5 text-xs font-mono outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            />
          </div>
        )}
        <button
          type="button"
          onClick={toggleAll}
          className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors shrink-0"
          style={dmSans}
        >
          {allRevealed ? <EyeOffIcon /> : <EyeIcon />}
          {allRevealed ? 'Alle verbergen' : 'Alle anzeigen'}
        </button>
      </div>

      <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 px-3 py-3" style={dmSans}>
            Keine Treffer.
          </p>
        ) : (
          filtered.map((v) => {
            const revealed = revealedRows.has(v.index)
            return (
              <div key={v.index} className="grid grid-cols-[minmax(0,9rem)_1fr_auto_auto] items-center gap-2 px-3 py-2 bg-gray-50">
                <code className="text-xs font-medium text-gray-700 truncate" title={v.key}>
                  {v.key}
                </code>
                <code className="text-xs text-gray-500 truncate" title={revealed ? v.value : undefined}>
                  {revealed ? v.value || '—' : '•'.repeat(Math.min(v.value.length, 16) || 4)}
                </code>
                <button
                  type="button"
                  onClick={() => toggleRow(v.index)}
                  title={revealed ? 'Verbergen' : 'Anzeigen'}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg transition-colors shrink-0"
                >
                  {revealed ? <EyeOffIcon /> : <EyeIcon />}
                </button>
                <button
                  type="button"
                  onClick={() => onCopyValue(v.value, `var-${v.index}`)}
                  title="Wert kopieren"
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg transition-colors shrink-0"
                >
                  {copiedField === `var-${v.index}` ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
