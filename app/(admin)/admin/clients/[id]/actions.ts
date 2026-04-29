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

  // Auth-User löschen → kaskadiert: profiles → clients → projects → documents
  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.auth.admin.deleteUser(client.profile_id)

  if (error) {
    console.error('[deleteClient] deleteUser error:', error.message)
    return { status: 'error', message: 'Fehler beim Löschen des Kunden: ' + error.message }
  }

  return { status: 'success' }
}
