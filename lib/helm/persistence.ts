import type { UIMessage } from 'ai'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/database'

/**
 * Speichert volle UIMessage-Objekte (role + parts[], inkl. Tool-Call-/Pending-Action-
 * Parts) statt nur den sichtbaren Text wie das alte lib/jarvis/persistence.ts — ein Reload
 * durchläuft damit verlustfrei denselben Rendering-Pfad (useChat({ initialMessages })).
 */
export async function loadHelmMessages(profileId: string, limit = 200): Promise<UIMessage[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('helm_messages')
    .select('message, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => {
    const message = row.message as unknown as UIMessage
    return { ...message, metadata: { ...(message.metadata as object | undefined), createdAt: row.created_at } }
  })
}

export async function appendHelmMessage(profileId: string, message: UIMessage): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('helm_messages')
    .insert({ profile_id: profileId, message: message as unknown as Json })
  if (error) throw new Error(error.message)
}

export async function clearHelmMessages(profileId: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('helm_messages').delete().eq('profile_id', profileId)
  if (error) throw new Error(error.message)
}
