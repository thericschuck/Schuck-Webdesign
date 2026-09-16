'use client'

import { useState } from 'react'

const dmSans = { fontFamily: 'var(--font-dm-sans)' }
const inputClass =
  'w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-mono outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50'

export interface VariableRow {
  key: string
  value: string
}

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

let rowIdCounter = 0

/** Uncontrolled Zeilen (defaultValue) — die Werte selbst gehen als FormData (var_key/var_value) raus,
 * React-State steuert nur, wie viele Zeilen es gibt und womit sie vorbefüllt starten. */
export function EnvVariablesEditor({ initialVariables, disabled }: { initialVariables?: VariableRow[]; disabled?: boolean }) {
  const [rows, setRows] = useState(() =>
    (initialVariables && initialVariables.length > 0 ? initialVariables : [{ key: '', value: '' }]).map((v) => ({
      id: rowIdCounter++,
      ...v,
    }))
  )

  const addRow = () => setRows((r) => [...r, { id: rowIdCounter++, key: '', value: '' }])
  const removeRow = (id: number) => setRows((r) => (r.length > 1 ? r.filter((row) => row.id !== id) : r))

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-1.5">
          <input name="var_key" defaultValue={row.key} disabled={disabled} placeholder="KEY" className={`${inputClass} w-32 shrink-0`} />
          <input name="var_value" defaultValue={row.value} disabled={disabled} placeholder="Wert" className={inputClass} />
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            disabled={disabled || rows.length === 1}
            title="Entfernen"
            className="shrink-0 w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-300 transition-colors"
          >
            ×
          </button>
        </div>
      ))}
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

export function EnvVariablesTable({
  variables,
  copiedField,
  onCopyValue,
}: {
  variables: VariableRow[]
  copiedField: string | null
  onCopyValue: (value: string, field: string) => void
}) {
  if (variables.length === 0) {
    return (
      <p className="text-xs text-gray-400" style={dmSans}>
        Keine Variablen.
      </p>
    )
  }

  return (
    <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
      {variables.map((v, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50">
          <code className="text-xs font-medium text-gray-700 shrink-0 max-w-32 truncate">{v.key}</code>
          <code className="flex-1 text-xs text-gray-500 truncate">{v.value}</code>
          <button
            type="button"
            onClick={() => onCopyValue(v.value, `var-${i}`)}
            title="Wert kopieren"
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg transition-colors shrink-0"
          >
            {copiedField === `var-${i}` ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
      ))}
    </div>
  )
}
