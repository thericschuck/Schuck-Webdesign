'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { createLeadAction } from './actions'

type State = { status: 'error'; message: string } | { status: 'success' } | null

const inputClass =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50'

export function NewLeadPanel() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<State, FormData>(createLeadAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.status === 'success') {
      formRef.current?.reset()
      setOpen(false)
    }
  }, [state])

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Neuer Lead
      </button>

      {open && (
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <form ref={formRef} action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input name="firmenname" required disabled={pending} placeholder="Firmenname *" className={inputClass} />
            <input name="ansprechpartner" disabled={pending} placeholder="Ansprechpartner" className={inputClass} />
            <input name="zielgruppe" disabled={pending} placeholder="Zielgruppe" className={inputClass} />
            <input name="stadt" disabled={pending} placeholder="Stadt" className={inputClass} />
            <input name="website" disabled={pending} placeholder="Website" className={inputClass} />
            <input name="phone" disabled={pending} placeholder="Telefon" className={inputClass} />
            <input name="email" disabled={pending} placeholder="E-Mail" type="email" className={inputClass} />
            <input name="quelle" disabled={pending} placeholder="Quelle (z.B. KI, Google, Netzwerk)" className={inputClass} />
            <select name="prioritaet" disabled={pending} defaultValue="medium" className={inputClass}>
              <option value="high">Priorität: Hoch</option>
              <option value="medium">Priorität: Mittel</option>
              <option value="low">Priorität: Niedrig</option>
            </select>
            <input name="website_qualitaet" disabled={pending} placeholder="Website-Qualität" className={inputClass} />
            <textarea
              name="notizen"
              disabled={pending}
              placeholder="Notizen"
              rows={2}
              className={`${inputClass} sm:col-span-2 resize-none`}
            />

            {state?.status === 'error' && (
              <p className="text-sm text-red-600 sm:col-span-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {state.message}
              </p>
            )}

            <div className="sm:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {pending ? 'Anlegen…' : 'Anlegen'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
