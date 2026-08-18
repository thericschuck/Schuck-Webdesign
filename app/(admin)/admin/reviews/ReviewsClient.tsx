'use client'

import { useState, useTransition } from 'react'
import {
  updateReview,
  createReview,
  approveReview,
  rejectReview,
  togglePublish,
  deleteReview,
} from './actions'

export type ReviewRow = {
  id: string
  rating: number
  text: string
  status: string
  published: boolean
  created_at: string
  reviewer_name: string | null
  reviewer_company: string | null
  project: { title: string } | { title: string }[] | null
}

export type ProjectOption = { id: string; title: string }

// ── Shared helpers ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending: 'Ausstehend',
  approved: 'Genehmigt',
  rejected: 'Abgelehnt',
}

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
}

const STAR_PATH =
  'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'

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
          <path strokeLinecap="round" strokeLinejoin="round" d={STAR_PATH} />
        </svg>
      ))}
    </div>
  )
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill={active >= n ? '#7F77DD' : 'none'}
            stroke={active >= n ? '#7F77DD' : '#d1d5db'}
            strokeWidth={1.5}
            className="transition-colors duration-100"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={STAR_PATH} />
          </svg>
        </button>
      ))}
    </div>
  )
}

// ── Form fields (shared between add + edit) ────────────────────────────────────

type FormState = {
  reviewer_name: string
  reviewer_company: string
  rating: number
  text: string
  project_id: string
}

function ReviewFormFields({
  state,
  onChange,
  projects,
}: {
  state: FormState
  onChange: (next: Partial<FormState>) => void
  projects: ProjectOption[]
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Name *</label>
          <input
            required
            value={state.reviewer_name}
            onChange={(e) => onChange({ reviewer_name: e.target.value })}
            placeholder="Max Mustermann"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Unternehmen</label>
          <input
            value={state.reviewer_company}
            onChange={(e) => onChange({ reviewer_company: e.target.value })}
            placeholder="Firma GmbH"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 mb-2 block">Bewertung *</label>
        <StarPicker value={state.rating} onChange={(r) => onChange({ rating: r })} />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Text *</label>
        <textarea
          required
          rows={3}
          value={state.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Die Zusammenarbeit war..."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Projekt (optional)</label>
        <select
          value={state.project_id}
          onChange={(e) => onChange({ project_id: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 bg-white"
        >
          <option value="">— Kein Projekt —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ── Add form card ──────────────────────────────────────────────────────────────

function AddReviewCard({
  projects,
  onClose,
}: {
  projects: ProjectOption[]
  onClose: () => void
}) {
  const EMPTY: FormState = {
    reviewer_name: '',
    reviewer_company: '',
    rating: 5,
    text: '',
    project_id: '',
  }
  const [form, setForm] = useState<FormState>(EMPTY)
  const [published, setPublished] = useState(true)
  const [pending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.reviewer_name || !form.text || form.rating < 1) return
    startTransition(async () => {
      await createReview({
        text: form.text,
        rating: form.rating,
        reviewer_name: form.reviewer_name,
        reviewer_company: form.reviewer_company,
        project_id: form.project_id || null,
        published,
      })
      onClose()
    })
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-900 mb-4">Neue Bewertung hinzufügen</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ReviewFormFields
          state={form}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          projects={projects}
        />

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-300"
          />
          <span className="text-xs text-gray-600">Sofort veröffentlichen</span>
        </label>

        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
          <button
            type="submit"
            disabled={pending}
            className="text-xs px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {pending ? 'Wird gespeichert…' : 'Bewertung speichern'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 font-medium transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Review card (with inline edit) ────────────────────────────────────────────

function ReviewCard({
  review,
  projects,
}: {
  review: ReviewRow
  projects: ProjectOption[]
}) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()

  const project = Array.isArray(review.project) ? review.project[0] : review.project
  const name = review.reviewer_name ?? 'Unbekannt'
  const company = review.reviewer_company
  const status = review.status as 'pending' | 'approved' | 'rejected'

  const currentProjectId =
    projects.find((p) => p.title === project?.title)?.id ?? ''

  const [form, setForm] = useState<FormState>({
    reviewer_name: review.reviewer_name ?? '',
    reviewer_company: review.reviewer_company ?? '',
    rating: review.rating,
    text: review.text,
    project_id: currentProjectId,
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      await updateReview(review.id, {
        text: form.text,
        rating: form.rating,
        reviewer_name: form.reviewer_name,
        reviewer_company: form.reviewer_company,
        project_id: form.project_id || null,
      })
      setEditing(false)
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      {editing ? (
        <>
          <p className="text-sm font-semibold text-gray-900">Bewertung bearbeiten</p>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <ReviewFormFields
              state={form}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
              projects={projects}
            />
            <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
              <button
                type="submit"
                disabled={pending}
                className="text-xs px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {pending ? 'Wird gespeichert…' : 'Speichern'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-xs px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 font-medium transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900">{name}</p>
                {company && <span className="text-xs text-gray-400">{company}</span>}
              </div>
              <div className="flex items-center gap-2">
                <Stars rating={review.rating} />
                {project && <span className="text-xs text-gray-400 truncate">· {project.title}</span>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0 justify-end">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_CLASS[status]}`}
              >
                {STATUS_LABEL[status]}
              </span>
              {review.published && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-indigo-50 text-indigo-700">
                  Veröffentlicht
                </span>
              )}
            </div>
          </div>

          {/* Text */}
          <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100 flex-wrap">
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

            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs px-3 py-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 font-medium transition-colors"
            >
              Bearbeiten
            </button>

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
        </>
      )}
    </div>
  )
}

// ── Main client component ──────────────────────────────────────────────────────

export function ReviewsClient({
  reviews,
  projects,
}: {
  reviews: ReviewRow[]
  projects: ProjectOption[]
}) {
  const [showAdd, setShowAdd] = useState(false)
  const pending = reviews.filter((r) => r.status === 'pending').length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bewertungen</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pending > 0
              ? `${pending} Bewertung${pending !== 1 ? 'en' : ''} zur Prüfung`
              : 'Alle Bewertungen geprüft'}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="shrink-0 text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
        >
          + Hinzufügen
        </button>
      </div>

      {showAdd && (
        <AddReviewCard projects={projects} onClose={() => setShowAdd(false)} />
      )}

      {reviews.length === 0 && !showAdd ? (
        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-16 text-center">
          <p className="text-gray-400 text-sm">Noch keine Bewertungen vorhanden.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} projects={projects} />
          ))}
        </div>
      )}
    </div>
  )
}
