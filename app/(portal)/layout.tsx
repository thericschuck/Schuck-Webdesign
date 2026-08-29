import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortalNav } from '@/components/portal/PortalNav'
import { ImpersonationBanner } from '@/components/portal/ImpersonationBanner'
import { readImpersonationState } from '@/lib/auth/impersonation'

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
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') redirect('/admin/dashboard')
  if (!profile) redirect('/login')

  // Läuft gerade eine Admin-Kundenansicht? Dann Banner + Rückweg einblenden.
  const impersonation = await readImpersonationState()

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {impersonation && <ImpersonationBanner clientLabel={impersonation.clientLabel} />}
      <PortalNav fullName={profile.full_name} email={profile.email} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-10">
        {children}
      </main>
    </div>
  )
}
