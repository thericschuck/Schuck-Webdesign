import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { ProjectStatus } from '@/types/database'
import { clientDisplayName } from '@/lib/client-name'

const STATUS_LABEL: Record<ProjectStatus, string> = {
  briefing: 'Briefing',
  design: 'Design',
  development: 'Entwicklung',
  review: 'Review',
  live: 'Live',
}

const STATUS_COLOR: Record<ProjectStatus, string> = {
  briefing: 'bg-gray-100 text-gray-600',
  design: 'bg-blue-50 text-blue-700',
  development: 'bg-amber-50 text-amber-700',
  review: 'bg-purple-50 text-purple-700',
  live: 'bg-green-50 text-green-700',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: clientCount },
    { data: projects },
    { count: docCount },
    { count: leadCount },
    { data: recentClients },
    { count: unreadMessages },
    { count: openRequests },
    { count: pendingReviews },
    { count: leadsWiedervorlageFaellig },
  ] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('projects').select('id, status'),
    supabase.from('documents').select('id', { count: 'exact', head: true }),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase
      .from('clients')
      .select('id, company_name, contact_name, status, created_at, profile:profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_role', 'client')
      .eq('read', false),
    supabase
      .from('change_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress']),
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .not('wiedervorlage', 'is', null)
      .lte('wiedervorlage', new Date().toISOString().slice(0, 10))
      .neq('current_stage', 'gewonnen')
      .neq('current_stage', 'verloren'),
  ])

  const liveCount = projects?.filter((p) => p.status === 'live').length ?? 0
  const activeCount = projects?.filter((p) => p.status !== 'live').length ?? 0

  const stats = [
    {
      label: 'Kunden gesamt',
      value: clientCount ?? 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: 'In Arbeit',
      value: activeCount,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      label: 'Live-Projekte',
      value: liveCount,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M8.464 15.536a5 5 0 010-7.072m7.072 0a5 5 0 010 7.072M12 12h.01" />
        </svg>
      ),
    },
    {
      label: 'Dokumente',
      value: docCount ?? 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: 'Leads',
      value: leadCount ?? 0,
      href: '/admin/akquise',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Übersicht über alle Kunden und Projekte
          </p>
        </div>
        <Link
          href="/admin/clients/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Neuer Kunde
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const content = (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-500 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {stat.label}
                </p>
                <span className="text-gray-400">{stat.icon}</span>
              </div>
              <p className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
                {stat.value}
              </p>
            </>
          )
          const className = 'bg-white rounded-2xl p-5 border border-gray-100 shadow-sm transition-colors' + (stat.href ? ' hover:border-gray-300' : '')
          return stat.href ? (
            <Link key={stat.label} href={stat.href} className={className}>
              {content}
            </Link>
          ) : (
            <div key={stat.label} className={className}>
              {content}
            </div>
          )
        })}
      </div>

      {/* Recent clients */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Neueste Kunden
          </h2>
          <Link href="/admin/clients" className="text-sm text-gray-500 hover:text-gray-900 transition-colors" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Alle anzeigen →
          </Link>
        </div>

        {recentClients && recentClients.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentClients.map((client) => {
              const profile = Array.isArray(client.profile) ? client.profile[0] : client.profile
              const displayName = clientDisplayName(profile?.full_name, client.contact_name, client.company_name)
              return (
                <Link
                  key={client.id}
                  href={`/admin/clients/${client.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-semibold">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {displayName}
                      </p>
                      {client.company_name && profile?.full_name && (
                        <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {client.company_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        client.status === 'active' ? 'bg-green-50 text-green-700' : client.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'
                      }`}
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                    >
                      {client.status === 'active' ? 'Aktiv' : client.status === 'pending' ? 'Ausstehend' : 'Inaktiv'}
                    </span>
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Noch keine Kunden. Lade den ersten ein.
            </p>
            <Link href="/admin/clients/new" className="inline-block mt-3 text-sm text-gray-900 font-medium hover:underline" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Kunden einladen →
            </Link>
          </div>
        )}
      </div>

      {/* Open items */}
      {((unreadMessages ?? 0) > 0 || (openRequests ?? 0) > 0 || (pendingReviews ?? 0) > 0 || (leadsWiedervorlageFaellig ?? 0) > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Offene Punkte
          </h2>
          <div className="flex flex-wrap gap-3">
            {(unreadMessages ?? 0) > 0 && (
              <Link
                href="/admin/projects"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 hover:bg-red-100 transition-colors"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4-1-4z" />
                </svg>
                <span className="font-medium">{unreadMessages}</span> ungelesene Nachricht{(unreadMessages ?? 0) !== 1 ? 'en' : ''}
              </Link>
            )}
            {(openRequests ?? 0) > 0 && (
              <Link
                href="/admin/projects"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700 hover:bg-amber-100 transition-colors"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="font-medium">{openRequests}</span> offene Anfrage{(openRequests ?? 0) !== 1 ? 'n' : ''}
              </Link>
            )}
            {(pendingReviews ?? 0) > 0 && (
              <Link
                href="/admin/projects"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 border border-purple-100 text-sm text-purple-700 hover:bg-purple-100 transition-colors"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <span className="font-medium">{pendingReviews}</span> Bewertung{(pendingReviews ?? 0) !== 1 ? 'en' : ''} zur Prüfung
              </Link>
            )}
            {(leadsWiedervorlageFaellig ?? 0) > 0 && (
              <Link
                href="/admin/akquise"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 border border-orange-100 text-sm text-orange-700 hover:bg-orange-100 transition-colors"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{leadsWiedervorlageFaellig}</span> Wiedervorlage{(leadsWiedervorlageFaellig ?? 0) !== 1 ? 'n' : ''} fällig
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Project status breakdown */}
      {projects && projects.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Projekte nach Status
          </h2>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((status) => {
              const count = projects.filter((p) => p.status === status).length
              if (count === 0) return null
              return (
                <Link
                  key={status}
                  href={`/admin/projects?status=${status}`}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLOR[status]}`}
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  {STATUS_LABEL[status]} <span className="opacity-60">({count})</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
