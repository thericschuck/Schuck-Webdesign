'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type DeleteResult = { status: 'error'; message: string } | { status: 'success' }

export async function deleteClient(clientId: string): Promise<DeleteResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (adminProfile?.role !== 'admin') redirect('/portal')

  const { data: client } = await supabase
    .from('clients')
    .select('profile_id')
    .eq('id', clientId)
    .single()

  if (!client) {
    return { status: 'error', message: 'Kunde nicht gefunden.' }
  }

  const adminSupabase = createAdminClient()

  // Projekt-IDs ermitteln, damit wir verknüpfte Zeilen vorab löschen können
  const { data: projects } = await adminSupabase
    .from('projects')
    .select('id')
    .eq('client_id', clientId)

  const projectIds = (projects ?? []).map((p: { id: string }) => p.id)

  // messages, change_requests und reviews referenzieren auth.users direkt (kein ON DELETE CASCADE).
  // Sie müssen manuell gelöscht werden, bevor deleteUser die auth.users-Zeile entfernt.
  if (projectIds.length > 0) {
    await adminSupabase.from('messages').delete().in('project_id', projectIds)
    await adminSupabase.from('change_requests').delete().in('project_id', projectIds)
    await adminSupabase.from('reviews').delete().in('project_id', projectIds)
  }
  await adminSupabase.from('reviews').delete().eq('client_id', client.profile_id)

  const { error } = await adminSupabase.auth.admin.deleteUser(client.profile_id)

  if (error) {
    console.error('[deleteClient] deleteUser error:', error.message)
    return { status: 'error', message: 'Fehler beim Löschen des Kunden: ' + error.message }
  }

  return { status: 'success' }
}
