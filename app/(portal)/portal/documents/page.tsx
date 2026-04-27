import { createClient } from '@/lib/supabase/server'
import { FileExplorer } from './FileExplorer'

type DocRow = {
  id: string
  name: string
  file_url: string
  folder: string | null
  created_at: string
  signedUrl: string | null
}

async function getSignedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fileUrl: string
) {
  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(fileUrl, 3600)
  return data?.signedUrl ?? null
}

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

  // Signed URLs für alle Dokumente generieren
  const projectsWithUrls = await Promise.all(
    (projects ?? []).map(async (p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      documents: await Promise.all(
        (p.documents ?? []).map(async (d): Promise<DocRow> => ({
          ...d,
          signedUrl: await getSignedUrl(supabase, d.file_url),
        }))
      ),
    }))
  )

  const totalCount = projectsWithUrls.reduce((s, p) => s + p.documents.length, 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dokumente</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {totalCount} {totalCount === 1 ? 'Dokument' : 'Dokumente'} in {projectsWithUrls.length}{' '}
          {projectsWithUrls.length === 1 ? 'Projekt' : 'Projekten'}
        </p>
      </div>

      <FileExplorer projects={projectsWithUrls} />
    </div>
  )
}
