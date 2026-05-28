'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/portal')
}

export async function markAsRead(id: string) {
  await assertAdmin()
  const supabase = createAdminClient()
  await supabase.from('contact_submissions').update({ read: true }).eq('id', id)
  revalidatePath('/admin/contact')
}

export async function markAllAsRead() {
  await assertAdmin()
  const supabase = createAdminClient()
  await supabase.from('contact_submissions').update({ read: true }).eq('read', false)
  revalidatePath('/admin/contact')
}
