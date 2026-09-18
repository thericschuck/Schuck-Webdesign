import type { UIMessage } from 'ai'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/database'

export interface HelmConversationSummary {
  id: string
  title: string | null
  pinned: boolean
  createdAt: string
  updatedAt: string
}

/** Liste der Konversationen eines Profils für die Sidebar/den Session-Picker — angepinnte
 * zuerst, sonst zuletzt aktiv zuerst. */
export async function listHelmConversations(profileId: string): Promise<HelmConversationSummary[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('helm_conversations')
    .select('id, title, pinned, created_at, updated_at')
    .eq('profile_id', profileId)
    .is('archived_at', null)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    pinned: row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

/**
 * Löst die aktive Konversation für die Vollbild-Seite (?c=<id>) und den Session-Picker des
 * schwebenden Widgets auf: die angefragte ID, falls sie diesem Profil gehört — sonst die
 * zuletzt aktive vorhandene Konversation — sonst wird eine neue angelegt. Nie ohne gültige
 * Konversations-ID zurückkehren, damit HelmChat immer eine valide conversationId bekommt.
 */
export async function resolveActiveConversationId(profileId: string, requestedId?: string | null): Promise<string> {
  const adminClient = createAdminClient()

  if (requestedId) {
    const { data } = await adminClient
      .from('helm_conversations')
      .select('id')
      .eq('id', requestedId)
      .eq('profile_id', profileId)
      .maybeSingle()
    if (data) return data.id
  }

  const { data: mostRecent } = await adminClient
    .from('helm_conversations')
    .select('id')
    .eq('profile_id', profileId)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (mostRecent) return mostRecent.id

  return createHelmConversation(profileId)
}

export async function createHelmConversation(profileId: string, title?: string | null): Promise<string> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('helm_conversations')
    .insert({ profile_id: profileId, title: title ?? null })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id
}

export async function renameHelmConversation(conversationId: string, title: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('helm_conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
  if (error) throw new Error(error.message)
}

export async function deleteHelmConversation(conversationId: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('helm_conversations').delete().eq('id', conversationId)
  if (error) throw new Error(error.message)
}

export async function togglePinHelmConversation(conversationId: string, pinned: boolean): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('helm_conversations')
    .update({ pinned, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
  if (error) throw new Error(error.message)
}

/**
 * Speichert volle UIMessage-Objekte (role + parts[], inkl. Tool-Call-/Pending-Action-
 * Parts) statt nur den sichtbaren Text wie das alte lib/jarvis/persistence.ts — ein Reload
 * durchläuft damit verlustfrei denselben Rendering-Pfad (useChat({ initialMessages })).
 */
export async function loadHelmMessages(conversationId: string, limit = 200): Promise<UIMessage[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('helm_messages')
    .select('message, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => {
    const message = row.message as unknown as UIMessage
    return { ...message, metadata: { ...(message.metadata as object | undefined), createdAt: row.created_at } }
  })
}

export async function appendHelmMessage(profileId: string, conversationId: string, message: UIMessage): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('helm_messages')
    .insert({ profile_id: profileId, conversation_id: conversationId, message: message as unknown as Json })
  if (error) throw new Error(error.message)

  await adminClient.from('helm_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)
}
