import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { clientDisplayName } from '@/lib/client-name'
import { ClientsTable, type ClientRow } from './ClientsTable'

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

  const rows: ClientRow[] = (clients ?? []).map((client) => {
    const profile = Array.isArray(client.profile) ? client.profile[0] : client.profile
    const projectCount = Array.isArray(client.projects) ? client.projects.length : 0
    const displayName = clientDisplayName(profile?.full_name, client.contact_name, client.company_name)
    const hasDistinctName = !!(profile?.full_name || client.contact_name)
    return {
      id: client.id,
      number: client.client_number,
      displayName,
      companyName: client.company_name && hasDistinctName ? client.company_name : null,
      hasPortalAccess: !!profile,
      email: profile?.email ?? client.contact_email,
      projectCount,
      status: client.status,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Kunden
          </h1>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {rows.length} Kunden insgesamt
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
        {rows.length > 0 ? (
          <ClientsTable rows={rows} />
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
