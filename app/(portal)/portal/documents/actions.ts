'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getDownloadUrl(fileUrl: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(fileUrl, 3600)

  return data?.signedUrl ?? null
}

/** Benennt eine eigene Datei um — RLS-Policy "documents: Client benennt eigene Uploads um"
 * (Migration 0020) erzwingt serverseitig, dass nur eigene Uploads (uploaded_by = auth.uid())
 * betroffen sein können; admin-verwaltete Dokumente bleiben unverändert (UPDATE betrifft
 * dann schlicht 0 Zeilen). */
export async function renameFile(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const documentId = formData.get('document_id') as string
  const newName = (formData.get('name') as string | null)?.trim()
  if (!documentId || !newName) return
  if (newName.length > 255 || /[/\\]/.test(newName)) return

  await supabase.from('documents').update({ name: newName }).eq('id', documentId)

  revalidatePath('/portal/documents')
}

/** Löscht eine eigene Datei. Storage-RLS für den 'documents'-Bucket prüft nur den
 * client_id-Ordner, nicht uploaded_by (Storage-Objekte kennen dieses Konzept nicht) —
 * deshalb ERST die DB-Zeile löschen (RLS erzwingt dort uploaded_by = auth.uid()) und nur
 * bei tatsächlich gelöschter Zeile danach das Storage-Objekt entfernen. Andernfalls könnte
 * ein Kunde ein admin-verwaltetes Dokument (z.B. einen Vertrag) im selben Storage-Ordner
 * physisch löschen, ohne die zugehörige DB-Zeile löschen zu dürfen — verwaiste Zeile mit
 * totem Link. */
export async function deleteFile(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const documentId = formData.get('document_id') as string
  if (!documentId) return

  const { data: doc } = await supabase.from('documents').select('file_url').eq('id', documentId).single()

  const { data: deletedRows, error } = await supabase.from('documents').delete().eq('id', documentId).select('id')
  if (error || !deletedRows || deletedRows.length === 0) return

  if (doc?.file_url) {
    await supabase.storage.from('documents').remove([doc.file_url])
  }

  revalidatePath('/portal/documents')
}
