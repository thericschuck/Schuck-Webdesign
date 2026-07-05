import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Prüft, dass der eingeloggte User die Rolle "admin" hat.
 * Redirected sonst zu /login (kein User) bzw. /portal (falsche Rolle).
 * Gibt bei Erfolg den session-gebundenen Supabase-Client zurück.
 */
export async function assertAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/portal')

  return supabase
}
