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

export async function updateReview(
  id: string,
  data: {
    text: string
    rating: number
    reviewer_name: string
    reviewer_company: string
    project_id: string | null
  }
) {
  const supabase = createAdminClient()
  await supabase
    .from('reviews')
    .update({
      text: data.text,
      rating: data.rating,
      reviewer_name: data.reviewer_name || undefined,
      reviewer_company: data.reviewer_company || undefined,
      project_id: data.project_id ?? undefined,
    })
    .eq('id', id)
  revalidatePath('/admin/reviews')
}

export async function createReview(data: {
  text: string
  rating: number
  reviewer_name: string
  reviewer_company: string
  project_id: string | null
  published: boolean
}) {
  const supabase = createAdminClient()
  await supabase.from('reviews').insert({
    text: data.text,
    rating: data.rating,
    reviewer_name: data.reviewer_name || undefined,
    reviewer_company: data.reviewer_company || undefined,
    project_id: data.project_id ?? undefined,
    client_id: undefined,
    status: 'approved',
    approved_at: new Date().toISOString(),
    published: data.published,
  })
  revalidatePath('/admin/reviews')
}
