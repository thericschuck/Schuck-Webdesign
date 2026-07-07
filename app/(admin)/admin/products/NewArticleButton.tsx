'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/admin/Modal'
import { createArticleAction } from './actions'
import { KATEGORIE_ORDER, TYP_OPTIONS } from './category-constants'

type State = { status: 'error'; message: string } | { status: 'success'; artNr: string } | null

const inputClass =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full'
const labelClass = 'text-xs font-medium text-gray-500 mb-1 block'

export function NewArticleButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<State, FormData>(createArticleAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.status === 'success') {
      formRef.current?.reset()
      setOpen(false)
      router.push(`/admin/products/${state.artNr}`)
    }
  }, [state, router])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Neuer Artikel
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Neuer Artikel">
        <form ref={formRef} action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Art-Nr. *</label>
            <input name="art_nr" required disabled={pending} placeholder="z.B. EX-07" className={`${inputClass} font-mono`} />
          </div>
          <div>
            <label className={labelClass}>Kategorie</label>
            <select name="kategorie" disabled={pending} defaultValue="" className={inputClass}>
              <option value="">— keine —</option>
              {KATEGORIE_ORDER.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Bezeichnung *</label>
            <input name="bezeichnung" required disabled={pending} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Preis min. (€)</label>
            <input name="preis_min" type="number" step="0.01" disabled={pending} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Preis max. (€)</label>
            <input name="preis_max" type="number" step="0.01" disabled={pending} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Einheit</label>
            <input name="einheit" disabled={pending} placeholder="z.B. Monatlich, Einmalig" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Typ</label>
            <input name="typ" list="typ-options-new" disabled={pending} className={inputClass} />
            <datalist id="typ-options-new">
              {TYP_OPTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          {state?.status === 'error' && (
            <p className="text-sm text-red-600 sm:col-span-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {state.message}
            </p>
          )}

          <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {pending ? 'Anlegen…' : 'Anlegen'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
