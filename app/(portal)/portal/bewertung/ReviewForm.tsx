'use client'

import { useActionState, useState } from 'react'
import { submitReview } from './actions'

type State = { status: 'error'; message: string } | { status: 'success'; message: string } | null

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)

  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
          aria-label={`${n} Stern${n !== 1 ? 'e' : ''}`}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill={n <= (hover || value) ? '#7F77DD' : 'none'}
            stroke={n <= (hover || value) ? '#7F77DD' : '#d1d5db'}
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>
      ))}
    </div>
  )
}

export function ReviewForm({ projectId }: { projectId: string }) {
  const [rating, setRating] = useState(0)
  const [state, action, pending] = useActionState<State, FormData>(submitReview, null)

  if (state?.status === 'success') {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50 px-6 py-5">
        <p className="text-sm font-medium text-green-800">{state.message}</p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="rating" value={rating} />

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Bewertung
        </label>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="review-text" className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Dein Feedback
        </label>
        <textarea
          id="review-text"
          name="text"
          required
          minLength={20}
          rows={5}
          disabled={pending}
          placeholder="Erzähl uns von deiner Erfahrung mit Schuck Webdesign..."
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-indigo-400 focus:bg-white transition-colors resize-none disabled:opacity-50"
        />
      </div>

      {state?.status === 'error' && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending || rating === 0}
        className="self-start px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? 'Wird gesendet…' : 'Bewertung einreichen'}
      </button>
    </form>
  )
}
