'use client'

import { useActionState, useMemo, useState } from 'react'
import { createBackfilledInvoiceAction } from './actions'
import { ItemsEditor, EMPTY_ITEM, isSubstantiveItem, type ItemDraft, type ArticleOption, type PackageOption } from '../ItemsEditor'

type State = { status: 'error'; message: string } | null

interface ClientOption {
  id: string
  display_name: string
  client_number: string | null
}

interface ProjectOption {
  id: string
  client_id: string
  title: string
  project_number: string | null
}

const inputClass =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50 w-full'

const labelClass = 'text-xs font-medium text-gray-500 mb-1 block'

export function NachtragenForm({
  clients,
  projects,
  articles,
  packages,
  defaultUstPflichtig,
}: {
  clients: ClientOption[]
  projects: ProjectOption[]
  articles: ArticleOption[]
  packages: PackageOption[]
  defaultUstPflichtig: boolean
}) {
  const [state, action, pending] = useActionState<State, FormData>(createBackfilledInvoiceAction, null)
  const [clientId, setClientId] = useState('')
  const [status, setStatus] = useState<'versendet' | 'bezahlt'>('versendet')
  const [items, setItems] = useState<ItemDraft[]>([{ ...EMPTY_ITEM }])
  const [pdfFileName, setPdfFileName] = useState<string | null>(null)

  const clientProjects = useMemo(() => projects.filter((p) => p.client_id === clientId), [projects, clientId])
  const validItems = items.filter(isSubstantiveItem)
  const total = validItems.reduce((sum, it) => sum + (it.menge || 0) * (it.ep || 0), 0)

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="items_json" value={JSON.stringify(validItems)} />

      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
        <p className="text-xs text-gray-600 leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Für Rechnungen, die du bereits außerhalb dieses Systems gestellt hast (z.B. vor Einführung dieser Software).
          Die Rechnungsnummer wird 1:1 übernommen — es wird <strong>keine</strong> neue Nummer gezogen. Danach ist die
          Rechnung wie jede andere gestellte Rechnung GoBD-unveränderlich.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Kunde *</label>
          <select
            name="client_id"
            required
            disabled={pending}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={inputClass}
          >
            <option value="">— auswählen —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.client_number ? `${c.client_number} · ` : ''}
                {c.display_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Projekt (optional)</label>
          <select name="project_id" disabled={pending || !clientId} className={inputClass} defaultValue="">
            <option value="">— kein Projekt —</option>
            {clientProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_number ? `${p.project_number} · ` : ''}
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Ursprüngliche Rechnungsnummer *</label>
          <input name="invoice_number" required disabled={pending} placeholder="z.B. 2025-01" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Rechnungsdatum *</label>
          <input name="invoice_date" type="date" required disabled={pending} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Leistungsdatum</label>
          <input name="service_date" type="date" disabled={pending} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Status *</label>
          <select
            name="status"
            required
            disabled={pending}
            value={status}
            onChange={(e) => setStatus(e.target.value as 'versendet' | 'bezahlt')}
            className={inputClass}
          >
            <option value="versendet">Versendet (offen)</option>
            <option value="bezahlt">Bezahlt</option>
          </select>
        </div>
        {status === 'bezahlt' && (
          <div>
            <label className={labelClass}>Bezahlt am</label>
            <input name="paid_at" type="date" disabled={pending} className={inputClass} />
          </div>
        )}
      </div>

      <ItemsEditor items={items} onChange={setItems} articles={articles} packages={packages} disabled={pending} />

      <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        Gesamt (netto): {total.toFixed(2)} €
      </p>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          <input name="ust_pflichtig" type="checkbox" defaultChecked={defaultUstPflichtig} disabled={pending} className="rounded border-gray-300" />
          Umsatzsteuerpflichtig (falls zum damaligen Zeitpunkt abweichend von den aktuellen Firmeneinstellungen)
        </label>
      </div>

      <div>
        <label className={labelClass}>Original-PDF (optional)</label>
        <input
          name="pdf_file"
          type="file"
          accept="application/pdf"
          disabled={pending}
          onChange={(e) => setPdfFileName(e.target.files?.[0]?.name ?? null)}
          className="text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 file:text-sm file:font-medium hover:file:bg-gray-200 disabled:opacity-50"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        />
        <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Wird 1:1 als Rechnungs-PDF abgelegt — das Original, das du schon hast.
        </p>
      </div>

      {!pdfFileName && (
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          <input name="generate_pdf" type="checkbox" disabled={pending} className="rounded border-gray-300" />
          Kein Original vorhanden — PDF stattdessen in diesem System neu erzeugen (Layout entspricht dann nicht dem Original)
        </label>
      )}

      {state?.status === 'error' && (
        <p className="text-sm text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !clientId || validItems.length === 0}
        className="self-start px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        {pending ? 'Wird nachgetragen…' : 'Rechnung nachtragen'}
      </button>
    </form>
  )
}
