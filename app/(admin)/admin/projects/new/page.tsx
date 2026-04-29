import { createClient } from '@/lib/supabase/server'
import { NewProjectForm } from './NewProjectForm'
import Link from 'next/link'

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>
}) {
  const { client_id } = await searchParams
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, company_name, status')
    .in('status', ['active', 'pending'])
    .order('company_name', { ascending: true })

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

      <NewProjectForm clients={clients ?? []} preselectedClientId={client_id} />
    </div>
  )
}
