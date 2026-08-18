'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { addPackageItemAction, removePackageItemAction, updatePackageItemAction } from '../actions'

type ActionResult = { status: 'error'; message: string } | { status: 'success' }

export interface ItemRow {
  art_nr: string
  pos: number
  menge: number | null
  ep: number | null
  gesamt: number | null
  bezeichnung: string
  einheit: string | null
}

export interface ArticleOption {
  art_nr: string
  bezeichnung: string
}

function fmtEuro(value: number | null) {
  return value == null ? '—' : `${value.toLocaleString('de-DE')} €`
}

const numberInputClass =
  'w-16 rounded-md border border-gray-200 px-1.5 py-1 text-xs text-right outline-none focus:border-gray-400'

function EditableRow({ pktNr, item }: { pktNr: string; item: ItemRow }) {
  const [menge, setMenge] = useState(String(item.menge ?? 1))
  const [ep, setEp] = useState(item.ep != null ? String(item.ep) : '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    const mengeNum = Number(menge)
    if (menge.trim() === '' || Number.isNaN(mengeNum)) {
      setError('Ungültige Menge.')
      return
    }
    const epNum = ep.trim() === '' ? null : Number(ep)
    if (epNum != null && Number.isNaN(epNum)) {
      setError('Ungültiger Preis.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await updatePackageItemAction(pktNr, item.art_nr, mengeNum, epNum)
      if (result.status === 'error') setError(result.message)
    })
  }

  function handleRemove() {
    setError(null)
    startTransition(async () => {
      const result = await removePackageItemAction(pktNr, item.art_nr)
      if (result.status === 'error') setError(result.message)
    })
  }

  return (
    <tr>
      <td className="px-6 py-3 text-sm text-gray-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        {item.pos}
      </td>
      <td className="px-6 py-3">
        <Link href={`/admin/products/${item.art_nr}`} className="text-sm text-violet-600 hover:underline font-mono">
          {item.art_nr}
        </Link>
      </td>
      <td className="px-6 py-3 text-sm text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        {item.bezeichnung}
        {item.einheit && <span className="text-gray-400 font-normal"> · {item.einheit}</span>}
      </td>
      <td className="px-6 py-3 text-right">
        <input
          type="number"
          step="0.01"
          value={menge}
          disabled={isPending}
          onChange={(e) => setMenge(e.target.value)}
          className={numberInputClass}
        />
      </td>
      <td className="px-6 py-3 text-right">
        <input
          type="number"
          step="0.01"
          placeholder="—"
          value={ep}
          disabled={isPending}
          onChange={(e) => setEp(e.target.value)}
          className="w-20 rounded-md border border-gray-200 px-1.5 py-1 text-xs text-right outline-none focus:border-gray-400"
        />
      </td>
      <td className="px-6 py-3 text-sm text-gray-900 font-medium text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        {fmtEuro(item.gesamt)}
      </td>
      <td className="px-6 py-3">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={handleSave}
            disabled={isPending}
            title="Speichern"
            className="p-1 rounded-md text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={handleRemove}
            disabled={isPending}
            title="Entfernen"
            className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {error && (
          <p className="text-[10px] text-red-600 mt-1 text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {error}
          </p>
        )}
      </td>
    </tr>
  )
}

function AddRow({ pktNr, availableArticles }: { pktNr: string; availableArticles: ArticleOption[] }) {
  const boundAction = addPackageItemAction.bind(null, pktNr)
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(boundAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.status === 'success') formRef.current?.reset()
  }, [state])

  if (availableArticles.length === 0) return null

  return (
    <tr>
      <td colSpan={7} className="px-6 py-3 bg-gray-50/60">
        <form ref={formRef} action={action} className="flex flex-wrap items-center gap-2">
          <select
            name="art_nr"
            required
            disabled={pending}
            defaultValue=""
            className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-900 bg-white outline-none focus:border-gray-400 min-w-40"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            <option value="" disabled>
              Artikel wählen…
            </option>
            {availableArticles.map((a) => (
              <option key={a.art_nr} value={a.art_nr}>
                {a.art_nr} · {a.bezeichnung}
              </option>
            ))}
          </select>
          <input
            name="menge"
            type="number"
            step="0.01"
            defaultValue="1"
            disabled={pending}
            placeholder="Menge"
            className={numberInputClass}
          />
          <input
            name="ep"
            type="number"
            step="0.01"
            disabled={pending}
            placeholder="EP (optional)"
            className="w-28 rounded-md border border-gray-200 px-1.5 py-1 text-xs text-right outline-none focus:border-gray-400"
          />
          <button
            type="submit"
            disabled={pending}
            className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {pending ? 'Hinzufügen…' : 'Position hinzufügen'}
          </button>
          {state?.status === 'error' && (
            <p className="text-xs text-red-600 w-full" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {state.message}
            </p>
          )}
        </form>
      </td>
    </tr>
  )
}

export function PackageItemsEditor({
  pktNr,
  items,
  availableArticles,
  paketpreis,
}: {
  pktNr: string
  items: ItemRow[]
  availableArticles: ArticleOption[]
  paketpreis: number | null
}) {
  const einzelpreiseSumme = items.reduce((sum, item) => sum + (item.gesamt ?? (item.ep ?? 0) * (item.menge ?? 1)), 0)
  const hasPriceData = items.some((i) => i.gesamt != null || i.ep != null)
  const ersparnis = hasPriceData && paketpreis != null ? einzelpreiseSumme - paketpreis : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/60">
        <h2 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Positionen
        </h2>
      </div>
      <div className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Pos.</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Art-Nr.</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Bezeichnung</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Menge</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>EP</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Gesamt</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Noch keine Positionen.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <EditableRow key={item.art_nr} pktNr={pktNr} item={item} />
            ))}
            <AddRow pktNr={pktNr} availableArticles={availableArticles} />
          </tbody>
          {hasPriceData && (
            <tfoot>
              <tr className="border-t border-gray-100 bg-gray-50/60">
                <td colSpan={5} className="px-6 py-3 text-sm text-gray-600 text-right font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Summe Einzelpreise
                </td>
                <td colSpan={2} className="px-6 py-3 text-sm text-gray-900 font-semibold text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {fmtEuro(einzelpreiseSumme)}
                </td>
              </tr>
              <tr>
                <td colSpan={5} className="px-6 py-3 text-sm text-gray-600 text-right font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Paketpreis
                </td>
                <td colSpan={2} className="px-6 py-3 text-sm text-gray-900 font-semibold text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {fmtEuro(paketpreis)}
                </td>
              </tr>
              {ersparnis != null && (
                <tr>
                  <td colSpan={5} className="px-6 py-3 text-sm text-green-700 text-right font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    Ersparnis
                  </td>
                  <td colSpan={2} className="px-6 py-3 text-sm text-green-700 font-semibold text-right" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {fmtEuro(ersparnis)}
                  </td>
                </tr>
              )}
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
