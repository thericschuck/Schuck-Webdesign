'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/assert-admin'
import {
  createHelmConversation,
  deleteHelmConversation,
  listHelmConversations,
  loadHelmMessages,
  renameHelmConversation,
  resolveActiveConversationId,
  togglePinHelmConversation,
  type HelmConversationSummary,
} from '../persistence'

// Ersetzt app/api/helm/history/route.ts (REST) — Server Actions sind direkt aus
// Client-Komponenten aufrufbar, kein eigener Fetch-Layer nötig (Athenas Muster in
// assistant/actions.ts).

async function currentUserId(): Promise<string> {
  const supabase = await assertAdmin()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet.')
  return user.id
}

export async function listConversations(): Promise<HelmConversationSummary[]> {
  const userId = await currentUserId()
  return listHelmConversations(userId)
}

export async function loadConversationMessages(conversationId: string) {
  await assertAdmin()
  return loadHelmMessages(conversationId)
}

/** Für das schwebende Widget beim ersten Öffnen: liefert eine garantiert gültige
 * Konversations-ID (zuletzt aktive vorhandene, sonst neu angelegt) — kein separater
 * "welche Session ist aktuell offen?"-Zustand nötig, das Widget merkt sich nur noch die ID. */
export async function resolveActiveConversation(): Promise<{ id: string }> {
  const userId = await currentUserId()
  const id = await resolveActiveConversationId(userId)
  return { id }
}

export async function createConversation(): Promise<{ id: string }> {
  const userId = await currentUserId()
  const id = await createHelmConversation(userId)
  revalidatePath('/admin/helm')
  return { id }
}

type ActionResult = { status: 'error'; message: string } | null

export async function renameConversation(conversationId: string, title: string): Promise<ActionResult> {
  await assertAdmin()
  const trimmed = title.trim()
  if (!trimmed) return { status: 'error', message: 'Titel darf nicht leer sein.' }
  try {
    await renameHelmConversation(conversationId, trimmed.slice(0, 200))
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Umbenennen fehlgeschlagen.' }
  }
  revalidatePath('/admin/helm')
  return null
}

export async function deleteConversation(conversationId: string): Promise<ActionResult> {
  await assertAdmin()
  try {
    await deleteHelmConversation(conversationId)
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Löschen fehlgeschlagen.' }
  }
  revalidatePath('/admin/helm')
  return null
}

export async function togglePinConversation(conversationId: string, pinned: boolean): Promise<ActionResult> {
  await assertAdmin()
  try {
    await togglePinHelmConversation(conversationId, pinned)
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Anpinnen fehlgeschlagen.' }
  }
  revalidatePath('/admin/helm')
  return null
}
