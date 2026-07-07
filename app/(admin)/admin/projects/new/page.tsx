import { createClient } from '@/lib/supabase/server'
import { NewProjectForm } from './NewProjectForm'
import Link from 'next/link'
import { clientDisplayName } from '@/lib/client-name'

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>
}) {
  const { client_id } = await searchParams
  const supabase = await createClient()

  const { data: clientsRaw } = await supabase
    .from('clients')
    .select('id, company_name, contact_name, status, profiles(full_name)')
    .in('status', ['active', 'pending'])

  const clients = (clientsRaw ?? [])
    .map((c) => {
      const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
      return { id: c.id, status: c.status, display_name: clientDisplayName(profile?.full_name, c.contact_name, c.company_name) }
    })
    .sort((a, b) => a.display_name.localeCompare(b.display_name))

  return (
    <div className="max-w-lg">
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/projects" className="hover:text-gray-600 transition-colors">Projekte</Link>
        <span>/</span>
        <span className="text-gray-700">Neues Projekt</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'var(--font-playfair)' }}>
        Neues Projekt anlegen
      </h1>

      <NewProjectForm clients={clients} preselectedClientId={client_id} />
    </div>
  )
}
