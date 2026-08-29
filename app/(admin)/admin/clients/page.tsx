import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { clientDisplayName } from '@/lib/client-name'
import { ClientsBoard } from './ClientsBoard'
import type { ClientProjectRef, ClientRow } from './types'

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
      address_city,
      status,
      created_at,
      profile:profiles(full_name, email),
      projects(id, title, status)
    `)
    .order('client_number', { ascending: false, nullsFirst: false })

  const rows: ClientRow[] = (clients ?? []).map((client) => {
    const profile = Array.isArray(client.profile) ? client.profile[0] : client.profile
    const projects = (Array.isArray(client.projects) ? client.projects : []) as ClientProjectRef[]
    const displayName = clientDisplayName(profile?.full_name, client.contact_name, client.company_name)
    const hasDistinctName = !!(profile?.full_name || client.contact_name)
    return {
      id: client.id,
      number: client.client_number,
      displayName,
      // Firma nur als Zusatz, wenn sie nicht schon der Anzeigename selbst ist.
      companyName: client.company_name && hasDistinctName ? client.company_name : null,
      hasPortalAccess: !!profile,
      email: profile?.email ?? client.contact_email,
      phone: client.phone,
      website: client.website,
      city: client.address_city,
      status: client.status,
      projects: [...projects].sort((a, b) => a.title.localeCompare(b.title, 'de')),
    }
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Kunden
          </h1>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Kontakte, Portal-Zugang und laufende Projekte auf einen Blick
          </p>
        </div>
        <Link
          href="/admin/clients/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors shrink-0"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Neuer Kunde
        </Link>
      </div>

      <ClientsBoard rows={rows} />
    </div>
  )
}
