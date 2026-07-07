'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import * as documentsDomain from '@/lib/domain/documents'

type UploadResult =
  | { status: 'success'; fileName: string }
  | { status: 'error'; message: string }

export async function uploadFile(
  _prev: UploadResult | null,
  formData: FormData
): Promise<UploadResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Nicht eingeloggt.' }

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!client) {
    return { status: 'error', message: 'Kein Kundeneintrag gefunden.' }
  }

  const file       = formData.get('file') as File | null
  const projectId  = formData.get('project_id') as string | null
  const folderRaw  = formData.get('folder') as string | null
  const folder     = folderRaw?.trim() || null

  if (!file || file.size === 0) {
    return { status: 'error', message: 'Bitte eine Datei auswählen.' }
  }

  // Wenn project_id angegeben, prüfen ob das Projekt dem Client gehört
  if (projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('client_id', client.id)
      .single()

    if (!project) {
      return { status: 'error', message: 'Ungültiges Projekt.' }
    }
  }

  try {
    const doc = await documentsDomain.uploadDocumentFile({
      file,
      clientId: client.id,
      projectId,
      folder,
      uploadedBy: user.id,
    })

    revalidatePath('/portal/documents')
    revalidatePath('/portal/upload')
    revalidatePath('/portal')

    return { status: 'success', fileName: doc.name }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Upload fehlgeschlagen.' }
  }
}
