import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/AdminNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { count: unreadMessages }] = await Promise.all([
    supabase.from('profiles').select('role, full_name').eq('id', user.id).single(),
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_role', 'client')
      .eq('read', false),
  ])

  if (profile?.role !== 'admin') redirect('/portal')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminNav adminName={profile.full_name} unreadMessages={unreadMessages ?? 0} />
      {/* Content area — offset by sidebar width */}
      <div className="flex-1 ml-60 min-h-screen">
        <main className="p-8 max-w-6xl">
          {children}
        </main>
      </div>
    </div>
  )
}
