import { createClient } from '@/lib/supabase/server'
import { FileExplorer } from './FileExplorer'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('profile_id', user!.id)
    .single()

  if (!client) {
    return <p className="text-sm text-gray-500">Kein Kundeneintrag gefunden.</p>
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, status, documents(id, name, file_url, folder, created_at)')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  const projectsData = (projects ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status as string,
    documents: (p.documents ?? []) as {
      id: string
      name: string
      file_url: string
      folder: string | null
      created_at: string
    }[],
  }))

  const totalCount = projectsData.reduce((s, p) => s + p.documents.length, 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-fraunces)' }}>
          Dokumente
        </h1>
        <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {totalCount} {totalCount === 1 ? 'Dokument' : 'Dokumente'} in {projectsData.length}{' '}
          {projectsData.length === 1 ? 'Projekt' : 'Projekten'}
        </p>
      </div>

      <FileExplorer projects={projectsData} />
    </div>
  )
}
