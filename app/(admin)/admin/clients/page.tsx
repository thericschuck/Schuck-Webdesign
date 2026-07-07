import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { ClientStatus } from '@/types/database'
import { clientDisplayName } from '@/lib/client-name'

const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  lead: 'Lead',
  pending: 'Ausstehend',
  active: 'Aktiv',
  paused: 'Pausiert',
  completed: 'Abgeschlossen',
  inactive: 'Inaktiv',
}

const CLIENT_STATUS_COLOR: Record<ClientStatus, string> = {
  lead: 'bg-purple-50 text-purple-700',
  pending: 'bg-amber-50 text-amber-700',
  active: 'bg-green-50 text-green-700',
  paused: 'bg-orange-50 text-orange-700',
  completed: 'bg-blue-50 text-blue-700',
  inactive: 'bg-gray-100 text-gray-500',
}

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select(`
      id,
      client_number,
      company_name,
      contact_name,
      contact_email,
      website,
      phone,
      status,
      created_at,
      profile:profiles(full_name, email),
      projects(id)
    `)
    .order('client_number', { ascending: false, nullsFirst: false })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Kunden
          </h1>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {clients?.length ?? 0} Kunden insgesamt
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

      {/* List / Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {clients && clients.length > 0 ? (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {clients.map((client) => {
                const profile = Array.isArray(client.profile) ? client.profile[0] : client.profile
                const projectCount = Array.isArray(client.projects) ? client.projects.length : 0
                const displayName = clientDisplayName(profile?.full_name, client.contact_name, client.company_name)
                const email = profile?.email ?? client.contact_email
                return (
                  <Link
                    key={client.id}
                    href={`/admin/clients/${client.id}`}
                    className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-semibold shrink-0">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {client.client_number && (
                          <span className="text-xs text-gray-400 font-mono shrink-0" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                            {client.client_number}
                          </span>
                        )}
                        <p className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {displayName}
                        </p>
                        {!profile && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 shrink-0" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                            Kein Portal-Zugang
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {email ?? '—'} · {projectCount} {projectCount === 1 ? 'Projekt' : 'Projekte'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${CLIENT_STATUS_COLOR[client.status]}`} style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {CLIENT_STATUS_LABEL[client.status]}
                      </span>
                      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Desktop table */}
            <table className="hidden md:table w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Nr.</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Kunde</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>E-Mail</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Projekte</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clients.map((client) => {
                  const profile = Array.isArray(client.profile) ? client.profile[0] : client.profile
                  const projectCount = Array.isArray(client.projects) ? client.projects.length : 0
                  const displayName = clientDisplayName(profile?.full_name, client.contact_name, client.company_name)
                  const email = profile?.email ?? client.contact_email
                  return (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-400 font-mono" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {client.client_number ?? '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-semibold shrink-0">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>{displayName}</p>
                              {!profile && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                                  Kein Portal-Zugang
                                </span>
                              )}
                            </div>
                            {client.company_name && (profile?.full_name || client.contact_name) && (
                              <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>{client.company_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>{email ?? '—'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>{projectCount} {projectCount === 1 ? 'Projekt' : 'Projekte'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${CLIENT_STATUS_COLOR[client.status]}`}
                          style={{ fontFamily: 'var(--font-dm-sans)' }}
                        >
                          {CLIENT_STATUS_LABEL[client.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/admin/clients/${client.id}`} className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          Details →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="text-gray-400 text-sm mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>Noch keine Kunden angelegt.</p>
            <Link href="/admin/clients/new" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:underline" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Ersten Kunden anlegen →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
