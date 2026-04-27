import { createAdminClient } from '@/lib/supabase/admin'
import { approveReview, rejectReview, togglePublish, deleteReview } from './actions'

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width="13"
          height="13"
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

const STATUS_LABEL = {
  pending: 'Ausstehend',
  approved: 'Genehmigt',
  rejected: 'Abgelehnt',
}

const STATUS_CLASS = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
}

export default async function ReviewsPage() {
  const supabase = createAdminClient()

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, rating, text, status, published, created_at, approved_at, reviewer_name, reviewer_company, project:projects(title)')
    .order('created_at', { ascending: false })

  const pending = reviews?.filter((r) => r.status === 'pending').length ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bewertungen</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pending > 0
              ? `${pending} Bewertung${pending !== 1 ? 'en' : ''} zur Prüfung`
              : 'Alle Bewertungen geprüft'}
          </p>
        </div>
      </div>

      {!reviews || reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-16 text-center">
          <p className="text-gray-400 text-sm">Noch keine Bewertungen vorhanden.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => {
            const project = Array.isArray(review.project) ? review.project[0] : review.project
            const name = review.reviewer_name ?? 'Unbekannt'
            const company = review.reviewer_company
            const status = review.status as 'pending' | 'approved' | 'rejected'

            return (
              <div
                key={review.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2.5">
                      <p className="text-sm font-semibold text-gray-900">{name}</p>
                      {company && (
                        <span className="text-xs text-gray-400">{company}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Stars rating={review.rating} />
                      {project && (
                        <span className="text-xs text-gray-400">· {project.title}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_CLASS[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                    {review.published && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-indigo-50 text-indigo-700">
                        Veröffentlicht
                      </span>
                    )}
                  </div>
                </div>

                {/* Review text */}
                <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                  {status === 'pending' && (
                    <>
                      <form action={approveReview.bind(null, review.id)}>
                        <button
                          type="submit"
                          className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium transition-colors"
                        >
                          Genehmigen
                        </button>
                      </form>
                      <form action={rejectReview.bind(null, review.id)}>
                        <button
                          type="submit"
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium transition-colors"
                        >
                          Ablehnen
                        </button>
                      </form>
                    </>
                  )}
                  {status === 'approved' && (
                    <form action={togglePublish.bind(null, review.id, review.published)}>
                      <button
                        type="submit"
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          review.published
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        {review.published ? 'Verstecken' : 'Veröffentlichen'}
                      </button>
                    </form>
                  )}
                  {status === 'rejected' && (
                    <form action={approveReview.bind(null, review.id)}>
                      <button
                        type="submit"
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
                      >
                        Doch genehmigen
                      </button>
                    </form>
                  )}
                  <div className="flex-1" />
                  <form action={deleteReview.bind(null, review.id)}>
                    <button
                      type="submit"
                      className="text-xs px-3 py-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 font-medium transition-colors"
                    >
                      Löschen
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
