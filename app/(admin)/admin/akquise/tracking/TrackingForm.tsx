'use client'

import { useActionState, useEffect, useRef } from 'react'
import { logTrackingAction } from './actions'

type State = { status: 'error'; message: string } | { status: 'success' } | null

const inputClass =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full'

const labelClass = 'text-xs font-medium text-gray-500 mb-1 block'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function TrackingForm() {
  const [state, action, pending] = useActionState<State, FormData>(logTrackingAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.status === 'success') {
      formRef.current?.reset()
    }
  }, [state])

  return (
    <form ref={formRef} action={action} className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
      <div>
        <label className={labelClass}>Datum</label>
        <input name="datum" type="date" disabled={pending} defaultValue={todayISO()} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Wählversuche</label>
        <input name="waehlversuche" type="number" min={0} disabled={pending} placeholder="0" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Empfang</label>
        <input name="gespraeche_empfang" type="number" min={0} disabled={pending} placeholder="0" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Entscheider</label>
        <input name="gespraeche_entscheider" type="number" min={0} disabled={pending} placeholder="0" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Termine</label>
        <input name="termine_vereinbart" type="number" min={0} disabled={pending} placeholder="0" className={inputClass} />
      </div>

      {state?.status === 'error' && (
        <p className="text-sm text-red-600 col-span-2 sm:col-span-5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {state.message}
        </p>
      )}
      {state?.status === 'success' && (
        <p className="text-sm text-green-600 col-span-2 sm:col-span-5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Eingetragen — Werte werden zum Tag addiert.
        </p>
      )}

      <div className="col-span-2 sm:col-span-5">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {pending ? 'Speichern…' : 'Eintragen'}
        </button>
      </div>
    </form>
  )
}
