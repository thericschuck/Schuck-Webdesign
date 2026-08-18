'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { addQualiCallAction, addSalesCallAction } from './actions'

type State = { status: 'error'; message: string } | { status: 'success' } | null
type Mode = 'quali' | 'sales' | null

const inputClass =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full'

const labelClass = 'text-xs font-medium text-gray-500 mb-1 block'

function QualiCallForm({ leadId, onSuccess }: { leadId: string; onSuccess: () => void }) {
  const boundAction = addQualiCallAction.bind(null, leadId)
  const [state, action, pending] = useActionState<State, FormData>(boundAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.status === 'success') {
      formRef.current?.reset()
      onSuccess()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <form ref={formRef} action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={labelClass}>Datum</label>
        <input name="quali_call_am" type="date" disabled={pending} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Ergebnis</label>
        <select name="quali_ergebnis" disabled={pending} defaultValue="offen" className={inputClass}>
          <option value="offen">Offen</option>
          <option value="follow_up">Follow-up</option>
          <option value="qualifiziert">Qualifiziert</option>
          <option value="disqualifiziert">Disqualifiziert</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Wiedervorlage</label>
        <input name="wiedervorlage" type="date" disabled={pending} className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Bedarf / Notizen</label>
        <textarea name="bedarf_notizen" rows={2} disabled={pending} className={`${inputClass} resize-none`} />
      </div>
      {state?.status === 'error' && (
        <p className="text-sm text-red-600 sm:col-span-2">{state.message}</p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {pending ? 'Speichern…' : 'Quali-Call speichern'}
        </button>
      </div>
    </form>
  )
}

function SalesCallForm({ leadId, onSuccess }: { leadId: string; onSuccess: () => void }) {
  const boundAction = addSalesCallAction.bind(null, leadId)
  const [state, action, pending] = useActionState<State, FormData>(boundAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.status === 'success') {
      formRef.current?.reset()
      onSuccess()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <form ref={formRef} action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={labelClass}>Datum</label>
        <input name="closing_call_am" type="date" disabled={pending} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Ergebnis</label>
        <select name="sales_ergebnis" disabled={pending} defaultValue="offen" className={inputClass}>
          <option value="offen">Offen</option>
          <option value="follow_up">Follow-up</option>
          <option value="abgeschlossen">Abgeschlossen</option>
          <option value="abgelehnt">Abgelehnt</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Angebotsvolumen (€)</label>
        <input name="angebotsvolumen" type="number" step="0.01" disabled={pending} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Leistungsbeginn</label>
        <input name="leistungsbeginn" type="date" disabled={pending} className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Leistungen</label>
        <textarea name="leistungen" rows={2} disabled={pending} className={`${inputClass} resize-none`} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Notizen</label>
        <textarea name="notizen" rows={2} disabled={pending} className={`${inputClass} resize-none`} />
      </div>
      {state?.status === 'error' && (
        <p className="text-sm text-red-600 sm:col-span-2">{state.message}</p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {pending ? 'Speichern…' : 'Sales-Call speichern'}
        </button>
      </div>
    </form>
  )
}

export function AddCallForm({ leadId, isFromSheet }: { leadId: string; isFromSheet?: boolean }) {
  const [mode, setMode] = useState<Mode>(null)

  if (isFromSheet) {
    return (
      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        Quali-/Sales-Calls für diesen Lead kommen aus dem Google Sheet — dort erfassen, nicht hier.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode(mode === 'quali' ? null : 'quali')}
          className={`px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
            mode === 'quali' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Quali-Call erfassen
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'sales' ? null : 'sales')}
          className={`px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
            mode === 'sales' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Sales-Call erfassen
        </button>
      </div>

      {mode === 'quali' && <QualiCallForm leadId={leadId} onSuccess={() => setMode(null)} />}
      {mode === 'sales' && <SalesCallForm leadId={leadId} onSuccess={() => setMode(null)} />}
    </div>
  )
}
