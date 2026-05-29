'use client'

import { useActionState } from 'react'
import { updateClient } from './actions'
import Link from 'next/link'

type State = { status: 'error'; message: string } | null

type Props = {
  clientId: string
  defaultValues: {
    company_name: string
    full_name: string
    phone: string
    website: string
    status: 'active' | 'inactive' | 'pending'
    address_street: string
    address_city: string
    address_zip: string
    address_country: string
    notes: string
  }
}

function Field({
  label,
  id,
  children,
  required,
}: {
  label: string
  id: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors bg-white'

export function EditClientForm({ clientId, defaultValues }: Props) {
  const boundAction = updateClient.bind(null, clientId)
  const [state, action, pending] = useActionState<State, FormData>(boundAction, null)

  return (
    <form action={action} className="flex flex-col gap-8">

      {/* ── Kontakt ─────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Kontakt
        </h2>

        <Field label="Firmenname" id="company_name" required>
          <input id="company_name" name="company_name" type="text" required
            defaultValue={defaultValues.company_name} disabled={pending} className={inputClass} />
        </Field>

        <Field label="Ansprechpartner" id="full_name">
          <input id="full_name" name="full_name" type="text"
            defaultValue={defaultValues.full_name} disabled={pending} className={inputClass} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Telefon" id="phone">
            <input id="phone" name="phone" type="tel"
              defaultValue={defaultValues.phone} disabled={pending} className={inputClass} />
          </Field>

          <Field label="Website" id="website">
            <input id="website" name="website" type="url"
              defaultValue={defaultValues.website} disabled={pending}
              placeholder="https://beispiel.de" className={inputClass} />
          </Field>
        </div>

        <Field label="Status" id="status">
          <select id="status" name="status" defaultValue={defaultValues.status}
            disabled={pending} className={inputClass}>
            <option value="active">Aktiv</option>
            <option value="pending">Ausstehend (Einladung offen)</option>
            <option value="inactive">Inaktiv</option>
          </select>
        </Field>
      </section>

      {/* ── Adresse ─────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Adresse
        </h2>

        <Field label="Straße & Hausnummer" id="address_street">
          <input id="address_street" name="address_street" type="text"
            defaultValue={defaultValues.address_street} disabled={pending}
            placeholder="Musterstraße 12" className={inputClass} />
        </Field>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="PLZ" id="address_zip">
            <input id="address_zip" name="address_zip" type="text"
              defaultValue={defaultValues.address_zip} disabled={pending}
              placeholder="12345" className={inputClass} />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Stadt" id="address_city">
              <input id="address_city" name="address_city" type="text"
                defaultValue={defaultValues.address_city} disabled={pending}
                placeholder="München" className={inputClass} />
            </Field>
          </div>
        </div>

        <Field label="Land" id="address_country">
          <input id="address_country" name="address_country" type="text"
            defaultValue={defaultValues.address_country || 'Deutschland'} disabled={pending}
            className={inputClass} />
        </Field>
      </section>

      {/* ── Interne Notizen ──────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Interne Notizen
        </h2>
        <p className="text-xs text-gray-400 -mt-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Nur für dich sichtbar — Kunden sehen diese Notizen nicht.
        </p>

        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={defaultValues.notes}
          disabled={pending}
          placeholder="z.B. Besondere Wünsche, Zahlungskonditionen, wichtige Hinweise…"
          className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors resize-none"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        />
      </section>

      {/* ── Fehler + Actions ────────────────────────────────── */}
      {state?.status === 'error' && (
        <p className="text-sm text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {state.message}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-gray-900 text-white text-sm font-semibold rounded-xl py-3 hover:bg-gray-700 disabled:opacity-50 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {pending ? 'Speichern…' : 'Speichern'}
        </button>
        <Link
          href={`/admin/clients/${clientId}`}
          className="px-5 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors text-center"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Abbrechen
        </Link>
      </div>
    </form>
  )
}
