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

  // Dokumente kundenweit laden statt über projects → documents: Uploads mit
  // "— Kein Projekt —" (siehe /portal/upload) haben project_id = null und wären über den
  // Projekt-Join unsichtbar gewesen — hochgeladen, aber nirgends mehr auffindbar.
  const [{ data: projects }, { data: documents }, { data: folders }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, status')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('documents')
      .select('id, name, file_url, folder, project_id, created_at, uploaded_by')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('folders')
      .select('id, project_id, path')
      .eq('client_id', client.id)
      .order('path'),
  ])

  const projectsData = (projects ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status as string,
  }))

  const documentsData = documents ?? []
  const totalCount = documentsData.length

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

      <FileExplorer
        projects={projectsData}
        documents={documentsData}
        folders={folders ?? []}
        currentUserId={user!.id}
      />
    </div>
  )
}
