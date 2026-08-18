import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/AdminNav'
import { JarvisWidget } from '@/components/admin/JarvisWidget'
import { ToastProvider } from '@/components/admin/ToastProvider'

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

  const [
    { data: profile },
    { count: unreadMessages },
    { count: pendingReviews },
    { count: unreadContacts },
    { count: openTodos },
    { count: leadsWiedervorlageFaellig },
  ] = await Promise.all([
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
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .not('wiedervorlage', 'is', null)
      .lte('wiedervorlage', new Date().toISOString().slice(0, 10))
      .neq('current_stage', 'gewonnen')
      .neq('current_stage', 'verloren'),
  ])

  if (profile?.role !== 'admin') redirect('/portal')

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
        <AdminNav
          adminName={profile.full_name}
          unreadMessages={unreadMessages ?? 0}
          pendingReviews={pendingReviews ?? 0}
          unreadContacts={unreadContacts ?? 0}
          openTodos={openTodos ?? 0}
          leadsWiedervorlageFaellig={leadsWiedervorlageFaellig ?? 0}
        />
        {/* Content area — offset by sidebar on desktop, top bar on mobile */}
        <div className="flex-1 min-w-0 md:ml-60 min-h-screen">
          {/* max-w-6xl bleibt der Standard (Lesbarkeit auf den meisten Bildschirmen) — ab 2xl
              (≥1536px, echte breite Monitore) fällt die Deckelung weg, damit breite Inhalte
              wie die Produkttabelle den vorhandenen Platz auch wirklich nutzen können.
              JARVIS im Vollbild (/admin/jarvis) ignoriert das ohnehin — siehe dort: eigener
              fixed-positionierter Shell wie /admin/jarvis/cockpit, unabhängig vom Seitenfluss. */}
          <main className="w-full p-4 md:p-8 pt-16 md:pt-8 max-w-6xl 2xl:max-w-none">{children}</main>
        </div>
        <JarvisWidget mode="floating" />
      </div>
    </ToastProvider>
  )
}
