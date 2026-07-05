'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/assert-admin'

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
