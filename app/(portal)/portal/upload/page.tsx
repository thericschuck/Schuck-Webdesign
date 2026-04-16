import { createClient } from '@/lib/supabase/server'
import { UploadForm } from './UploadForm'

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('profile_id', user!.id)
    .single()

  // Projekte des Kunden laden
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, status')
    .eq('client_id', client?.id ?? '')
    .order('created_at', { ascending: false })

  // Vorhandene Ordner pro Projekt ermitteln
  const { data: existingDocs } = await supabase
    .from('documents')
    .select('project_id, folder')
    .eq('client_id', client?.id ?? '')
    .not('folder', 'is', null)

  // Map: project_id -> unique folders
  const foldersByProject: Record<string, string[]> = {}
  for (const doc of existingDocs ?? []) {
    if (!doc.project_id || !doc.folder) continue
    if (!foldersByProject[doc.project_id]) foldersByProject[doc.project_id] = []
    if (!foldersByProject[doc.project_id].includes(doc.folder)) {
      foldersByProject[doc.project_id].push(doc.folder)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dateien hochladen</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Lade Logos, Fotos, Texte oder andere Projektdateien hoch.
        </p>
      </div>

      <UploadForm
        projects={projects ?? []}
        foldersByProject={foldersByProject}
      />
    </div>
  )
}
