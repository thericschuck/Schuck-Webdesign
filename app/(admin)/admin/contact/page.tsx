import { createAdminClient } from '@/lib/supabase/admin'
import { markAsRead, markAllAsRead } from './actions'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const TYPE_COLOR: Record<string, string> = {
  'Neue Website':   'bg-violet-50 text-violet-700',
  'Redesign':       'bg-blue-50 text-blue-700',
  'Landing Page':   'bg-sky-50 text-sky-700',
  'Consulting':     'bg-amber-50 text-amber-700',
  'Anderes':        'bg-gray-100 text-gray-600',
}

export default async function ContactPage() {
  const supabase = createAdminClient()

  const { data: submissions } = await supabase
    .from('contact_submissions')
    .select('id, name, email, type, message, read, created_at')
    .order('created_at', { ascending: false })

  const list = submissions ?? []
  const unreadCount = list.filter((s) => !s.read).length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Kontaktanfragen
          </h1>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {list.length} Anfragen gesamt{unreadCount > 0 ? ` · ${unreadCount} ungelesen` : ''}
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllAsRead}>
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Alle als gelesen markieren
            </button>
          </form>
        )}
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Noch keine Anfragen eingegangen.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((s) => (
            <div
              key={s.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${
                s.read ? 'border-gray-100' : 'border-violet-200'
              }`}
            >
              {/* Top bar */}
              <div className={`px-6 py-3 flex items-center justify-between gap-4 ${s.read ? 'bg-white' : 'bg-violet-50/60'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  {!s.read && (
                    <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-gray-900 mr-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {s.name}
                    </span>
                    <a
                      href={`mailto:${s.email}?subject=Re: ${s.type}`}
                      className="text-xs text-violet-600 hover:underline"
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                    >
                      {s.email}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_COLOR[s.type] ?? 'bg-gray-100 text-gray-600'}`}
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    {s.type}
                  </span>
                  <span className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {formatDate(s.created_at)}
                  </span>
                  {!s.read && (
                    <form action={markAsRead.bind(null, s.id)}>
                      <button
                        type="submit"
                        className="text-xs text-gray-400 hover:text-gray-700 transition-colors underline underline-offset-2"
                        style={{ fontFamily: 'var(--font-dm-sans)' }}
                      >
                        Gelesen
                      </button>
                    </form>
                  )}
                </div>
              </div>
              {/* Message */}
              <div className="px-6 py-4 border-t border-gray-50">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {s.message}
                </p>
              </div>
              {/* Reply CTA */}
              <div className="px-6 py-3 border-t border-gray-50 flex justify-end">
                <a
                  href={`mailto:${s.email}?subject=Re: ${encodeURIComponent(s.type)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-900 hover:text-violet-700 transition-colors"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Antworten
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
