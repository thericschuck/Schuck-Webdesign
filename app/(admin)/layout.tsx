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

  const [{ data: profile }, { count: unreadMessages }, { count: pendingReviews }, { count: unreadContacts }, { count: openTodos }] = await Promise.all([
    supabase.from('profiles').select('role, full_name').eq('id', user.id).single(),
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_role', 'client')
      .eq('read', false),
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('contact_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('read', false),
    supabase
      .from('todos')
      .select('id', { count: 'exact', head: true })
      .eq('done', false),
  ])

  if (profile?.role !== 'admin') redirect('/portal')

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
      <AdminNav adminName={profile.full_name} unreadMessages={unreadMessages ?? 0} pendingReviews={pendingReviews ?? 0} unreadContacts={unreadContacts ?? 0} openTodos={openTodos ?? 0} />
      {/* Content area — offset by sidebar on desktop, top bar on mobile */}
      <div className="flex-1 min-w-0 md:ml-60 min-h-screen">
        <main className="w-full p-4 md:p-8 pt-16 md:pt-8 max-w-6xl">
          {children}
        </main>
      </div>
    </div>
  )
}
