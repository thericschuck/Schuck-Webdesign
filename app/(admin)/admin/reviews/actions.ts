'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function approveReview(id: string) {
  const supabase = createAdminClient()
  await supabase
    .from('reviews')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/admin/reviews')
}

export async function rejectReview(id: string) {
  const supabase = createAdminClient()
  await supabase.from('reviews').update({ status: 'rejected' }).eq('id', id)
  revalidatePath('/admin/reviews')
}

export async function togglePublish(id: string, published: boolean) {
  const supabase = createAdminClient()
  await supabase.from('reviews').update({ published: !published }).eq('id', id)
  revalidatePath('/admin/reviews')
}

export async function deleteReview(id: string) {
  const supabase = createAdminClient()
  await supabase.from('reviews').delete().eq('id', id)
  revalidatePath('/admin/reviews')
}
