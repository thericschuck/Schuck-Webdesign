'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import * as foldersDomain from '@/lib/domain/folders'

/** Signierte URL für eine Datei des eigenen Kunden-Ordners. Der Storage-RLS-Check
 * ("storage: Client liest eigene Dokumente") begrenzt `fileUrl` serverseitig auf den
 * eigenen client_id-Ordner — deshalb darf der Pfad ungeprüft vom Client kommen.
 * Mit `downloadName` setzt Supabase `Content-Disposition: attachment` samt Dateiname;
 * ohne wird die Datei zum Anzeigen (Preview) ausgeliefert. */
export async function getDownloadUrl(fileUrl: string, downloadName?: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(fileUrl, 3600, downloadName ? { download: downloadName } : undefined)

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

// ── Ordner & Verschieben ──────────────────────────────────────────────────────
// Die folders-Domain (Migration 0035) läuft über den Service-Role-Client und umgeht RLS.
// Deshalb wird hier VOR jedem Aufruf geprüft, dass die betroffene Ebene wirklich dem
// eingeloggten Kunden gehört — ohne diesen Riegel könnte ein Portal-Nutzer über eine
// manipulierte client_id in fremden Ordnern arbeiten.

export type FileOpResult = { status: 'success' } | { status: 'error'; message: string }

/** Kunden-Eintrag der aktuellen Portal-Session. */
async function currentClient(): Promise<{ clientId: string; userId: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: client } = await supabase.from('clients').select('id').eq('profile_id', user.id).single()
  if (!client) return null

  return { clientId: client.id, userId: user.id }
}

/** Prüft, dass ein Projekt (falls angegeben) diesem Kunden gehört. */
async function ownsProject(clientId: string, projectId: string | null): Promise<boolean> {
  if (projectId === null) return true

  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('client_id', clientId)
    .maybeSingle()

  return Boolean(data)
}

function failure(error: unknown, fallback: string): FileOpResult {
  return { status: 'error', message: error instanceof Error ? error.message : fallback }
}

/**
 * Verschiebt eine Datei in einen anderen Ordner oder ein anderes Projekt des Kunden.
 * Wie beim Umbenennen und Löschen gilt: nur eigene Uploads. Admin-verwaltete Dokumente
 * (Verträge, Angebote, Care-Reports) darf der Kunde nicht umsortieren.
 */
export async function movePortalDocument(
  documentId: string,
  targetProjectId: string | null,
  targetFolder: string | null
): Promise<FileOpResult> {
  const session = await currentClient()
  if (!session) return { status: 'error', message: 'Kein Kundeneintrag gefunden.' }

  const supabase = await createClient()
  const { data: doc } = await supabase
    .from('documents')
    .select('id, client_id, uploaded_by')
    .eq('id', documentId)
    .maybeSingle()

  if (!doc || doc.client_id !== session.clientId) {
    return { status: 'error', message: 'Datei nicht gefunden.' }
  }
  if (doc.uploaded_by !== session.userId) {
    return { status: 'error', message: 'Von Schuck Webdesign bereitgestellte Dateien lassen sich nicht verschieben.' }
  }
  if (!(await ownsProject(session.clientId, targetProjectId))) {
    return { status: 'error', message: 'Ungültiges Projekt.' }
  }

  try {
    await foldersDomain.moveDocument({ documentId, targetProjectId, targetFolder })
    revalidatePath('/portal', 'layout')
    return { status: 'success' }
  } catch (error) {
    return failure(error, 'Verschieben fehlgeschlagen.')
  }
}

export async function createPortalFolder(
  projectId: string | null,
  parent: string | null,
  name: string
): Promise<FileOpResult> {
  const session = await currentClient()
  if (!session) return { status: 'error', message: 'Kein Kundeneintrag gefunden.' }
  if (!(await ownsProject(session.clientId, projectId))) {
    return { status: 'error', message: 'Ungültiges Projekt.' }
  }

  try {
    await foldersDomain.createFolder({
      clientId: session.clientId,
      projectId,
      parent,
      name,
      createdBy: session.userId,
    })
    revalidatePath('/portal', 'layout')
    return { status: 'success' }
  } catch (error) {
    return failure(error, 'Ordner konnte nicht erstellt werden.')
  }
}

export async function renamePortalFolder(
  projectId: string | null,
  path: string,
  newName: string
): Promise<FileOpResult> {
  const session = await currentClient()
  if (!session) return { status: 'error', message: 'Kein Kundeneintrag gefunden.' }
  if (!(await ownsProject(session.clientId, projectId))) {
    return { status: 'error', message: 'Ungültiges Projekt.' }
  }

  try {
    await foldersDomain.renameFolder({ clientId: session.clientId, projectId, path, newName })
    revalidatePath('/portal', 'layout')
    return { status: 'success' }
  } catch (error) {
    return failure(error, 'Ordner konnte nicht umbenannt werden.')
  }
}

export async function deletePortalFolder(projectId: string | null, path: string): Promise<FileOpResult> {
  const session = await currentClient()
  if (!session) return { status: 'error', message: 'Kein Kundeneintrag gefunden.' }
  if (!(await ownsProject(session.clientId, projectId))) {
    return { status: 'error', message: 'Ungültiges Projekt.' }
  }

  try {
    await foldersDomain.deleteFolder({ clientId: session.clientId, projectId, path })
    revalidatePath('/portal', 'layout')
    return { status: 'success' }
  } catch (error) {
    return failure(error, 'Ordner konnte nicht gelöscht werden.')
  }
}
