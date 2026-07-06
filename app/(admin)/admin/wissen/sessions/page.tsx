import Link from 'next/link'
import * as knowledgeDomain from '@/lib/domain/knowledge'

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function SessionLogsPage() {
  const logs = await knowledgeDomain.listSessionLogs()

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/wissen" className="hover:text-gray-600 transition-colors">
          Wissensgraph
        </Link>
        <span>/</span>
        <span className="text-gray-700">Session-Logs</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Session-Logs
        </h1>
        <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {logs.length} {logs.length === 1 ? 'Gespräch' : 'Gespräche'} protokolliert
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 p-6" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Noch keine Session-Logs. JARVIS legt sie über write_session_log am Ende relevanter Gespräche an.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-4 mb-1">
                  {log.node_id ? (
                    <Link
                      href={`/admin/wissen/${log.node_id}`}
                      className="text-sm font-medium text-gray-900 hover:underline"
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                    >
                      {log.node_label ?? 'Session'}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {log.node_label ?? 'Session'}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 shrink-0" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {fmtDateTime(log.created_at)}
                  </span>
                </div>
                {log.summary && (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {log.summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
