import Link from 'next/link'
import { notFound } from 'next/navigation'
import * as knowledgeDomain from '@/lib/domain/knowledge'
import { NodeBodyForm } from './NodeBodyForm'
import { DeprecateNodeButton } from './DeprecateNodeButton'
import { LinkNodeForm } from './LinkNodeForm'

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function NodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let node
  try {
    node = await knowledgeDomain.getNode(id)
  } catch {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/wissen" className="hover:text-gray-600 transition-colors">
          Wissensgraph
        </Link>
        <span>/</span>
        <span className="text-gray-700">{node.label}</span>
      </nav>

      <div className="flex items-center gap-2">
        <span
          className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {node.type}
        </span>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          {node.label}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Left */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Metadaten
            </h2>
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Quelle
                </dt>
                <dd className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {node.source}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Confidence
                </dt>
                <dd className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {node.confidence}
                </dd>
              </div>
              {node.ref_table && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    Referenz
                  </dt>
                  <dd className="text-sm text-gray-800 break-all" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {node.ref_table} / {node.ref_id}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Erstellt
                </dt>
                <dd className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {fmtDateTime(node.created_at)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Gefahrenbereich
            </h2>
            <DeprecateNodeButton nodeId={node.id} isDeprecated={node.confidence === 'deprecated'} />
          </div>
        </div>

        {/* Right */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Bearbeiten
            </h2>
            <NodeBodyForm node={node} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Kante anlegen
            </h2>
            <LinkNodeForm fromId={node.id} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Kanten ({node.outgoing.length + node.incoming.length})
            </h2>
            {node.outgoing.length === 0 && node.incoming.length === 0 ? (
              <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Noch keine Kanten.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {node.outgoing.map((edge) => (
                  <div
                    key={edge.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl border border-gray-100 bg-gray-50"
                  >
                    <p className="text-sm text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      <span className="text-gray-400">→ {edge.type} →</span>{' '}
                      {edge.to ? (
                        <Link href={`/admin/wissen/${edge.to.id}`} className="font-medium text-gray-900 hover:underline">
                          {edge.to.label}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </p>
                    <span className="text-xs text-gray-400">weight {edge.weight}</span>
                  </div>
                ))}
                {node.incoming.map((edge) => (
                  <div
                    key={edge.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl border border-gray-100 bg-gray-50"
                  >
                    <p className="text-sm text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {edge.from ? (
                        <Link href={`/admin/wissen/${edge.from.id}`} className="font-medium text-gray-900 hover:underline">
                          {edge.from.label}
                        </Link>
                      ) : (
                        '—'
                      )}{' '}
                      <span className="text-gray-400">→ {edge.type} →</span>
                    </p>
                    <span className="text-xs text-gray-400">weight {edge.weight}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
