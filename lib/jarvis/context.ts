import { createAdminClient } from '@/lib/supabase/admin'

export interface ColdStartContext {
  openTodos: { title: string; priority: string; due_date: string | null }[]
  openTodosCount: number
  unreadContacts: { name: string; type: string; created_at: string }[]
  unreadContactsCount: number
  projectsByStatus: Record<string, number>
}

/**
 * Direkter DB-Snapshot für die Cold-Start-Begrüßung. Läuft server-seitig
 * VOR dem eigentlichen Claude-Call, da für Todos/Kontaktanfragen noch keine
 * Tools existieren, mit denen Claude sich die Daten selbst holen könnte.
 */
export async function getColdStartContext(): Promise<ColdStartContext> {
  const adminClient = createAdminClient()

  const [todosRes, contactsRes, projectsRes] = await Promise.all([
    adminClient
      .from('todos')
      .select('title, priority, due_date', { count: 'exact' })
      .eq('done', false)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(5),
    adminClient
      .from('contact_submissions')
      .select('name, type, created_at', { count: 'exact' })
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(5),
    adminClient.from('projects').select('status'),
  ])

  const projectsByStatus: Record<string, number> = {}
  for (const row of projectsRes.data ?? []) {
    projectsByStatus[row.status] = (projectsByStatus[row.status] ?? 0) + 1
  }

  return {
    openTodos: todosRes.data ?? [],
    openTodosCount: todosRes.count ?? 0,
    unreadContacts: contactsRes.data ?? [],
    unreadContactsCount: contactsRes.count ?? 0,
    projectsByStatus,
  }
}
