import { createClient } from '@/lib/supabase/server'
import { ReviewForm } from './ReviewForm'

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={n <= rating ? '#7F77DD' : 'none'}
          stroke={n <= rating ? '#7F77DD' : '#d1d5db'}
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      ))}
    </div>
  )
}

export default async function BewertungPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('profile_id', user!.id)
    .single()

  const [{ data: projects }, { data: existingReviews }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, status')
      .eq('client_id', client?.id ?? '')
      .order('created_at', { ascending: false }),
    supabase
      .from('reviews')
      .select('id, project_id, rating, text, status')
      .eq('client_id', user!.id),
  ])

  const reviewByProject = Object.fromEntries(
    (existingReviews ?? []).map((r) => [r.project_id, r])
  )

  const reviewableProjects = (projects ?? []).filter((p) => !reviewByProject[p.id])
  const reviewedProjects = (projects ?? []).filter((p) => reviewByProject[p.id])

  const STATUS_LABEL = {
    pending: 'Wird geprüft',
    approved: 'Genehmigt',
    rejected: 'Abgelehnt',
  }

  const STATUS_CLASS = {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-700',
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Bewertung abgeben</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Deine Meinung hilft anderen Kunden und wird nach Prüfung auf der Website veröffentlicht.
        </p>
      </div>

      {/* Existing reviews */}
      {reviewedProjects.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Deine Bewertungen</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {reviewedProjects.map((p) => {
              const rev = reviewByProject[p.id]
              return (
                <div key={p.id} className="px-6 py-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-800">{p.title}</p>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_CLASS[rev.status as keyof typeof STATUS_CLASS]}`}
                    >
                      {STATUS_LABEL[rev.status as keyof typeof STATUS_LABEL]}
                    </span>
                  </div>
                  <Stars rating={rev.rating} />
                  <p className="text-sm text-gray-500 leading-relaxed">{rev.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Review form */}
      {reviewableProjects.length > 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              {reviewableProjects.length === 1
                ? reviewableProjects[0].title
                : 'Neues Projekt bewerten'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Deine Bewertung wird nach Prüfung freigeschaltet.</p>
          </div>
          <div className="px-6 py-5">
            {reviewableProjects.length === 1 ? (
              <ReviewForm projectId={reviewableProjects[0].id} />
            ) : (
              /* Multiple reviewable projects — show one form per project */
              <div className="flex flex-col gap-8">
                {reviewableProjects.map((p) => (
                  <div key={p.id}>
                    <p className="text-sm font-semibold text-gray-700 mb-3">{p.title}</p>
                    <ReviewForm projectId={p.id} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        reviewedProjects.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center">
            <p className="text-sm text-gray-400">Noch keine abgeschlossenen Projekte vorhanden.</p>
          </div>
        )
      )}
    </div>
  )
}
