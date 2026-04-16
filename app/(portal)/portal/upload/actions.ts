'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MAX_SIZE_MB    = 10
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

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
  if (file.size > MAX_SIZE_BYTES) {
    return { status: 'error', message: `Datei zu groß. Maximal ${MAX_SIZE_MB} MB erlaubt.` }
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { status: 'error', message: 'Dateityp nicht erlaubt. Erlaubt: PDF, Bilder, ZIP, Word.' }
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

  // Pfad: <client_id>/<timestamp>_<filename>
  const safeName    = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${client.id}/${Date.now()}_${safeName}`

  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[upload] storage error:', uploadError.message)
    return { status: 'error', message: 'Upload fehlgeschlagen. Bitte erneut versuchen.' }
  }

  const { error: dbError } = await supabase.from('documents').insert({
    client_id:   client.id,
    project_id:  projectId || null,
    folder:      folder,
    name:        file.name,
    file_url:    storagePath,
    category:    'other',
    uploaded_by: user.id,
  })

  if (dbError) {
    console.error('[upload] db error:', dbError.message)
    await supabase.storage.from('documents').remove([storagePath])
    return { status: 'error', message: 'Datenbankfehler. Bitte erneut versuchen.' }
  }

  revalidatePath('/portal/documents')
  revalidatePath('/portal/upload')
  revalidatePath('/portal')

  return { status: 'success', fileName: file.name }
}
