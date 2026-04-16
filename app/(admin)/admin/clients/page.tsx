import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select(`
      id,
      company_name,
      website,
      phone,
      status,
      created_at,
      profile:profiles(full_name, email),
      projects(id)
    `)
    .order('created_at', { ascending: false })

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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {clients && clients.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Unternehmen
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Kontakt
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Projekte
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Status
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map((client) => {
                const profile = Array.isArray(client.profile) ? client.profile[0] : client.profile
                const projectCount = Array.isArray(client.projects) ? client.projects.length : 0
                return (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-semibold shrink-0">
                          {client.company_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                            {client.company_name}
                          </p>
                          {client.website && (
                            <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                              {client.website}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {profile?.full_name ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {profile?.email}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {projectCount} {projectCount === 1 ? 'Projekt' : 'Projekte'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          client.status === 'active' ? 'bg-green-50 text-green-700' : client.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'
                        }`}
                        style={{ fontFamily: 'var(--font-dm-sans)' }}
                      >
                        {client.status === 'active' ? 'Aktiv' : client.status === 'pending' ? 'Ausstehend' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
                        style={{ fontFamily: 'var(--font-dm-sans)' }}
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="text-gray-400 text-sm mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Noch keine Kunden angelegt.
            </p>
            <Link
              href="/admin/clients/new"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:underline"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Ersten Kunden einladen →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
