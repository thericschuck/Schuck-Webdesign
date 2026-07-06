'use client'

import { useActionState } from 'react'
import { updateCompanySettingsAction } from './actions'
import type { CompanySettings } from '@/types/database'

type State = { status: 'error'; message: string } | { status: 'success' } | null

const inputClass =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full'

const labelClass = 'text-xs font-medium text-gray-500 mb-1 block'

export function CompanySettingsForm({ settings }: { settings: CompanySettings }) {
  const [state, action, pending] = useActionState<State, FormData>(updateCompanySettingsAction, null)

  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className={labelClass}>Firmenname *</label>
        <input name="company_name" required disabled={pending} defaultValue={settings.company_name} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Inhaber</label>
        <input name="inhaber" disabled={pending} defaultValue={settings.inhaber ?? ''} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>E-Mail</label>
        <input name="email" type="email" disabled={pending} defaultValue={settings.email ?? ''} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Straße + Nr.</label>
        <input name="address_street" disabled={pending} defaultValue={settings.address_street ?? ''} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>PLZ</label>
          <input name="address_zip" disabled={pending} defaultValue={settings.address_zip ?? ''} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Ort</label>
          <input name="address_city" disabled={pending} defaultValue={settings.address_city ?? ''} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Land</label>
        <input name="address_country" disabled={pending} defaultValue={settings.address_country} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Telefon</label>
        <input name="phone" disabled={pending} defaultValue={settings.phone ?? ''} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Website</label>
        <input name="website" disabled={pending} defaultValue={settings.website ?? ''} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>IBAN</label>
        <input name="iban" disabled={pending} defaultValue={settings.iban ?? ''} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>BIC</label>
        <input name="bic" disabled={pending} defaultValue={settings.bic ?? ''} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Steuernummer</label>
        <input name="steuernummer" disabled={pending} defaultValue={settings.steuernummer ?? ''} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>USt-IdNr.</label>
        <input name="ust_id" disabled={pending} defaultValue={settings.ust_id ?? ''} className={inputClass} />
      </div>

      <div className="sm:col-span-2 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
        <label className="flex items-center gap-2 text-sm text-gray-800 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          <input type="checkbox" name="ust_pflichtig" defaultChecked={settings.ust_pflichtig} disabled={pending} />
          Umsatzsteuerpflichtig (deaktiviert = Kleinunternehmer nach § 19 UStG)
        </label>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Dieser Status wird bei jeder neuen Rechnung eingefroren. Eine Änderung hier wirkt sich <strong>nicht</strong>{' '}
          auf bereits gestellte Rechnungen aus (GoBD).
        </p>
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
