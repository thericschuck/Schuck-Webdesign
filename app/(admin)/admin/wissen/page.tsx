import Link from 'next/link'
import * as knowledgeDomain from '@/lib/domain/knowledge'
import { NewNodeForm } from './NewNodeForm'
import type { NodeConfidence, NodeSource, NodeType } from '@/types/database'

const TYPE_LABEL: Record<NodeType, string> = {
  client: 'Kunde',
  project: 'Projekt',
  contact: 'Kontakt',
  fact: 'Fakt',
  preference: 'Präferenz',
  note: 'Notiz',
  process: 'Prozess',
  product: 'Produkt',
  session: 'Session',
}

const CONFIDENCE_COLOR: Record<NodeConfidence, string> = {
  high: 'bg-green-50 text-green-700',
  medium: 'bg-blue-50 text-blue-700',
  low: 'bg-amber-50 text-amber-700',
  deprecated: 'bg-gray-100 text-gray-400',
}

const SOURCE_LABEL: Record<NodeSource, string> = {
  jarvis_auto: 'JARVIS (automatisch)',
  user_explicit: 'Manuell',
  imported: 'Importiert',
}

interface SearchParams {
  q?: string
  type?: string
  confidence?: string
  source?: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function WissenPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams

  const nodes = await knowledgeDomain.listNodes({
    search: sp.q || undefined,
    type: (sp.type as NodeType) || undefined,
    confidence: (sp.confidence as NodeConfidence) || undefined,
    source: (sp.source as NodeSource) || undefined,
  })

  const hasFilters = !!(sp.q || sp.type || sp.confidence || sp.source)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Wissensgraph
          </h1>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {nodes.length} {nodes.length === 1 ? 'Knoten' : 'Knoten'}
            {hasFilters ? ' (gefiltert)' : ' insgesamt'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/wissen/sessions"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Session-Logs
          </Link>
          <NewNodeForm />
        </div>
      </div>

      <form
        method="GET"
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3"
      >
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Label/Text durchsuchen…"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white flex-1 min-w-[180px]"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        />
        <select
          name="type"
          defaultValue={sp.type ?? ''}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          <option value="">Alle Typen</option>
          {Object.entries(TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="confidence"
          defaultValue={sp.confidence ?? ''}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          <option value="">Alle Confidence-Stufen</option>
          <option value="high">Hoch</option>
          <option value="medium">Mittel</option>
          <option value="low">Niedrig</option>
          <option value="deprecated">Deprecated</option>
        </select>
        <select
          name="source"
          defaultValue={sp.source ?? ''}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          <option value="">Alle Quellen</option>
          {Object.entries(SOURCE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Filtern
        </button>
        {hasFilters && (
          <Link
            href="/admin/wissen"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Zurücksetzen
          </Link>
        )}
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {nodes.length === 0 ? (
          <p className="text-sm text-gray-400 p-6" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Keine Knoten gefunden.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {nodes.map((node) => (
              <Link
                key={node.id}
                href={`/admin/wissen/${node.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium shrink-0"
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                    >
                      {TYPE_LABEL[node.type]}
                    </span>
                    <p className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {node.label}
                    </p>
                  </div>
                  {node.body && (
                    <p className="text-xs text-gray-400 mt-1 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {node.body}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONFIDENCE_COLOR[node.confidence]}`}
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    {node.confidence}
                  </span>
                  <span className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {fmtDate(node.created_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
