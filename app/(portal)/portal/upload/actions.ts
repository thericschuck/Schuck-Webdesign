'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import * as documentsDomain from '@/lib/domain/documents'
import type { RegisterResult, TicketResult } from '@/lib/use-direct-upload'

/**
 * Portal-Upload in zwei Schritten (siehe lib/use-direct-upload.ts): erst ein Ticket für
 * den Direkt-Upload in den Storage, danach das Registrieren der fertigen Datei. Die
 * Datei selbst läuft nie durch eine Server Action — deshalb gibt es hier auch kein
 * Größenlimit mehr.
 */

/** Kunden-ID der aktuellen Portal-Session. */
async function currentClientId(): Promise<{ clientId: string; userId: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: client } = await supabase.from('clients').select('id').eq('profile_id', user.id).single()
  if (!client) return null

  return { clientId: client.id, userId: user.id }
}

export async function createPortalUploadTicket(fileName: string): Promise<TicketResult> {
  const session = await currentClientId()
  if (!session) return { status: 'error', message: 'Kein Kundeneintrag gefunden.' }

  try {
    const ticket = await documentsDomain.createUploadTicket(session.clientId, fileName)
    return { status: 'ok', path: ticket.path, token: ticket.token }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Upload konnte nicht vorbereitet werden.' }
  }
}

export async function registerPortalUpload(
  path: string,
  fileName: string,
  projectId: string | null,
  folder: string | null
): Promise<RegisterResult> {
  const session = await currentClientId()
  if (!session) return { status: 'error', message: 'Kein Kundeneintrag gefunden.' }

  // Wenn project_id angegeben, prüfen ob das Projekt dem Client gehört
  if (projectId) {
    const supabase = await createClient()
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('client_id', session.clientId)
      .single()

    if (!project) return { status: 'error', message: 'Ungültiges Projekt.' }
  }

  try {
    const doc = await documentsDomain.registerUploadedFile({
      path,
      clientId: session.clientId,
      projectId,
      folder: folder?.trim() || null,
      name: fileName,
      uploadedBy: session.userId,
    })

    revalidatePath('/portal/documents')
    revalidatePath('/portal/upload')
    revalidatePath('/portal')

    return { status: 'success', fileName: doc.name }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Upload fehlgeschlagen.' }
  }
}
