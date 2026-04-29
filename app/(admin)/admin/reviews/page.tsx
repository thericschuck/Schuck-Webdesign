import { createAdminClient } from '@/lib/supabase/admin'
import { ReviewsClient } from './ReviewsClient'

export default async function ReviewsPage() {
  const supabase = createAdminClient()

  const [{ data: reviews }, { data: projects }] = await Promise.all([
    supabase
      .from('reviews')
      .select(
        'id, rating, text, status, published, created_at, reviewer_name, reviewer_company, project:projects(title)'
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, title')
      .order('title', { ascending: true }),
  ])

  return (
    <ReviewsClient
      reviews={reviews ?? []}
      projects={projects ?? []}
    />
  )
}
