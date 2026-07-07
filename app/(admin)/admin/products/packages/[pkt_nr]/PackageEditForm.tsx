'use client'

import { useActionState } from 'react'
import { updatePackageAction } from '../actions'
import type { Package } from '@/types/database'

type State = { status: 'error'; message: string } | { status: 'success' } | null

const inputClass =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full'

const labelClass = 'text-xs font-medium text-gray-500 mb-1 block'

export function PackageEditForm({ pkg }: { pkg: Package }) {
  const boundAction = updatePackageAction.bind(null, pkg.pkt_nr)
  const [state, action, pending] = useActionState<State, FormData>(boundAction, null)

  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className={labelClass}>Paketname *</label>
        <input name="paketname" required disabled={pending} defaultValue={pkg.paketname} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Paketpreis (€)</label>
        <input
          name="paketpreis"
          type="number"
          step="0.01"
          disabled={pending}
          defaultValue={pkg.paketpreis ?? ''}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Laufzeit</label>
        <input
          name="laufzeit"
          disabled={pending}
          defaultValue={pkg.laufzeit ?? ''}
          placeholder="z.B. ca. 2–3 Wochen oder Monatlich, kündbar"
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Zielgruppe</label>
        <textarea
          name="zielgruppe"
          rows={2}
          disabled={pending}
          defaultValue={pkg.zielgruppe ?? ''}
          className={`${inputClass} resize-none`}
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Empfohlenes Folgeprodukt</label>
        <input
          name="folgeprodukt"
          disabled={pending}
          defaultValue={pkg.folgeprodukt ?? ''}
          placeholder="z.B. CP-201 Care Basic (49 €/Mo)"
          className={inputClass}
        />
      </div>

      {state?.status === 'error' && (
        <p className="text-sm text-red-600 sm:col-span-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {state.message}
        </p>
      )}
      {state?.status === 'success' && (
        <p className="text-sm text-green-600 sm:col-span-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Gespeichert.
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {pending ? 'Speichern…' : 'Speichern'}
        </button>
      </div>
    </form>
  )
}
