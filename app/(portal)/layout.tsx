import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Portal Layout – Server Component.
 * Zweite Sicherheitslinie nach dem Proxy (Middleware).
 * Nur eingeloggte User mit role='client' kommen durch.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  if (profile?.role === 'admin') redirect('/admin/dashboard')
  if (!profile) redirect('/login')

  return <>{children}</>
}
