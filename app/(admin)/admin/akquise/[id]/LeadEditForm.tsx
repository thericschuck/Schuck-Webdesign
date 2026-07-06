'use client'

import { useActionState } from 'react'
import { updateLeadAction } from './actions'
import type { Lead } from '@/types/database'

type State = { status: 'error'; message: string } | { status: 'success' } | null

const inputClass =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full'

const labelClass = 'text-xs font-medium text-gray-500 mb-1 block'

export function LeadEditForm({ lead }: { lead: Lead }) {
  const boundAction = updateLeadAction.bind(null, lead.id)
  const [state, action, pending] = useActionState<State, FormData>(boundAction, null)

  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={labelClass}>Firmenname *</label>
        <input name="firmenname" required disabled={pending} defaultValue={lead.firmenname} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Ansprechpartner</label>
        <input name="ansprechpartner" disabled={pending} defaultValue={lead.ansprechpartner ?? ''} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Position</label>
        <input name="position" disabled={pending} defaultValue={lead.position ?? ''} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Zielgruppe</label>
        <input name="zielgruppe" disabled={pending} defaultValue={lead.zielgruppe ?? ''} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Stadt</label>
        <input name="stadt" disabled={pending} defaultValue={lead.stadt ?? ''} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Website</label>
        <input name="website" disabled={pending} defaultValue={lead.website ?? ''} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Telefon</label>
        <input name="phone" disabled={pending} defaultValue={lead.phone ?? ''} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>E-Mail</label>
        <input name="email" type="email" disabled={pending} defaultValue={lead.email ?? ''} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Quelle</label>
        <input name="quelle" disabled={pending} defaultValue={lead.quelle ?? ''} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Website-Qualität</label>
        <input name="website_qualitaet" disabled={pending} defaultValue={lead.website_qualitaet ?? ''} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Priorität</label>
        <select name="prioritaet" disabled={pending} defaultValue={lead.prioritaet} className={inputClass}>
          <option value="high">Hoch</option>
          <option value="medium">Mittel</option>
          <option value="low">Niedrig</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Akquise-Ergebnis</label>
        <select name="akquise_ergebnis" disabled={pending} defaultValue={lead.akquise_ergebnis} className={inputClass}>
          <option value="offen">Offen</option>
          <option value="nicht_erreicht">Nicht erreicht</option>
          <option value="wiedervorlage">Wiedervorlage</option>
          <option value="kein_interesse">Kein Interesse</option>
          <option value="qualifiziert">Qualifiziert</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Erstkontakt am</label>
        <input
          name="erstkontakt_am"
          type="date"
          disabled={pending}
          defaultValue={lead.erstkontakt_am ?? ''}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Wiedervorlage</label>
        <input
          name="wiedervorlage"
          type="date"
          disabled={pending}
          defaultValue={lead.wiedervorlage ?? ''}
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Notizen</label>
        <textarea
          name="notizen"
          rows={3}
          disabled={pending}
          defaultValue={lead.notizen ?? ''}
          className={`${inputClass} resize-none`}
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
