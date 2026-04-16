'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function deleteClient(clientId: string): Promise<void> {
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

  // profile_id des Kunden ermitteln
  const { data: client } = await supabase
    .from('clients')
    .select('profile_id')
    .eq('id', clientId)
    .single()

  if (!client) {
    throw new Error('Kunde nicht gefunden.')
  }

  // Auth-User löschen → kaskadiert: profiles → clients → projects → documents
  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.auth.admin.deleteUser(client.profile_id)

  if (error) {
    console.error('[deleteClient] deleteUser error:', error.message)
    throw new Error('Fehler beim Löschen des Kunden: ' + error.message)
  }

  redirect('/admin/clients')
}
