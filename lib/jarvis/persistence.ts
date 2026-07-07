import { createAdminClient } from '@/lib/supabase/admin'

export interface PersistedMessage {
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

/**
 * Volle gespeicherte Historie für die Anzeige (Scrollback) — bewusst separat von
 * der beim Modell-Call tatsächlich mitgeschickten (gekappten) Historie, siehe
 * JarvisWidget.
 */
export async function loadConversation(profileId: string, limit = 200): Promise<PersistedMessage[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('jarvis_messages')
    .select('role, content, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []) as PersistedMessage[]
}

export async function appendMessage(profileId: string, role: 'user' | 'assistant', content: string): Promise<void> {
  if (!content.trim()) return
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('jarvis_messages').insert({ profile_id: profileId, role, content })
  if (error) throw new Error(error.message)
}

export async function clearConversation(profileId: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('jarvis_messages').delete().eq('profile_id', profileId)
  if (error) throw new Error(error.message)
}
