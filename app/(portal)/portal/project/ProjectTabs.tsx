'use client'

import { useActionState, useState, useRef, useEffect } from 'react'
import { motion, LayoutGroup } from 'framer-motion'
import { submitChangeRequest, submitReview } from './actions'

type ActionResult = { status: 'success' } | { status: 'error'; message: string }

type Update = { id: string; message: string; created_at: string }
type Meeting = {
  id: string
  title: string
  meeting_date: string
  duration_minutes: number | null
  notes: string | null
  action_items: unknown
}
type ChangeRequest = {
  id: string
  title: string
  description: string | null
  admin_notes: string | null
  status: 'open' | 'in_progress' | 'done' | 'rejected'
  created_at: string
}
type Review = {
  id: string
  rating: number
  text: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
} | null

type Props = {
  projectId: string
  userId: string
  updates: Update[]
  meetings: Meeting[]
  changeRequests: ChangeRequest[]
  existingReview: Review
}

const TABS = [
  { id: 'overview' as const, label: 'Überblick' },
  { id: 'meetings' as const, label: 'Besprechungen' },
  { id: 'requests' as const, label: 'Anfragen' },
  { id: 'review' as const, label: 'Bewertung' },
]
type TabId = typeof TABS[number]['id']

const CR_LABEL: Record<ChangeRequest['status'], string> = {
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  done: 'Erledigt',
  rejected: 'Abgelehnt',
}
const CR_COLOR: Record<ChangeRequest['status'], string> = {
  open: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  done: 'bg-green-50 text-green-700',
  rejected: 'bg-gray-100 text-gray-500',
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}
function formatDateTime(s: string) {
  return new Date(s).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg className={`w-7 h-7 transition-colors ${filled ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

export function ProjectTabs({ projectId, userId, updates, meetings, changeRequests, existingReview }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  // Change request form
  const boundSubmitCR = submitChangeRequest.bind(null, projectId)
  const [crState, crAction, crPending] = useActionState<ActionResult | null, FormData>(boundSubmitCR, null)
  const crFormRef = useRef<HTMLFormElement>(null)
  const [showCRForm, setShowCRForm] = useState(false)

  // Review form
  const boundSubmitReview = submitReview.bind(null, projectId)
  const [reviewState, reviewAction, reviewPending] = useActionState<ActionResult | null, FormData>(boundSubmitReview, null)
  const [selectedRating, setSelectedRating] = useState(existingReview?.rating ?? 0)
  const [hoverRating, setHoverRating] = useState(0)

  useEffect(() => {
    if (crState?.status === 'success') {
      crFormRef.current?.reset()
      setShowCRForm(false)
    }
  }, [crState])

  const openRequests = changeRequests.filter((cr) => cr.status === 'open' || cr.status === 'in_progress').length

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <LayoutGroup id="project-tabs">
          <div className="flex min-w-max gap-1 border-b border-black/8">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'relative flex items-center gap-1.5 px-4 py-2.5 pb-3 text-sm whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'text-[#1C1C1E] font-medium'
                    : 'text-[#7A746B] hover:text-[#1C1C1E]',
                ].join(' ')}
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {tab.label}
                {tab.id === 'requests' && openRequests > 0 && (
                  <span className="rounded-full bg-[#F6E7D5] px-1.5 py-0.5 text-xs leading-none text-[#B76B1D]">
                    {openRequests}
                  </span>
                )}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1C1C1E]"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
              </button>
            ))}
          </div>
        </LayoutGroup>
      </div>

      {/* ── Überblick ── */}
      {activeTab === 'overview' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Projektverlauf</h2>
          {updates.length > 0 ? (
            <ol className="relative border-l border-gray-200 space-y-6 ml-3">
              {updates.map((u) => (
                <li key={u.id} className="pl-5 relative">
                  <span className="absolute -left-5.5 flex h-3 w-3 items-center justify-center rounded-full bg-black top-0.5" />
                  <time className="text-xs text-gray-400">{formatDateTime(u.created_at)}</time>
                  <p className="mt-1 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{u.message}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-400">Noch keine Updates eingetragen.</p>
          )}
        </div>
      )}

      {/* ── Besprechungen ── */}
      {activeTab === 'meetings' && (
        <div className="space-y-3">
          {meetings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
              <p className="text-sm text-gray-400">Noch keine Besprechungen dokumentiert.</p>
            </div>
          ) : (
            meetings.map((m) => {
              const items = Array.isArray(m.action_items) ? (m.action_items as string[]) : []
              return (
                <div key={m.id} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{m.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(m.meeting_date)}
                      {m.duration_minutes ? ` · ${m.duration_minutes} Min.` : ''}
                    </p>
                  </div>
                  {m.notes && (
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{m.notes}</p>
                  )}
                  {items.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Aufgaben</p>
                      <ul className="space-y-1.5">
                        {items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="mt-0.5 w-4 h-4 rounded border border-gray-300 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Anfragen ── */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {changeRequests.length > 0 && (
            <div className="space-y-3">
              {changeRequests.map((cr) => (
                <div key={cr.id} className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{cr.title}</p>
                      {cr.description && (
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed whitespace-pre-wrap">{cr.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">{formatDateTime(cr.created_at)}</p>
                    </div>
                    <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${CR_COLOR[cr.status]}`}>
                      {CR_LABEL[cr.status]}
                    </span>
                  </div>
                  {cr.admin_notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Antwort</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{cr.admin_notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showCRForm ? (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Neue Anfrage</h3>
              <form ref={crFormRef} action={crAction} className="space-y-3">
                <input
                  name="title"
                  type="text"
                  required
                  disabled={crPending}
                  placeholder="Titel der Anfrage"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50"
                />
                <textarea
                  name="description"
                  rows={3}
                  disabled={crPending}
                  placeholder="Beschreibung (optional)"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 resize-none"
                />
                {crState?.status === 'error' && (
                  <p className="text-sm text-red-600">{crState.message}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCRForm(false)}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={crPending}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    {crPending ? 'Wird gesendet…' : 'Anfrage senden'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setShowCRForm(true)}
              className="w-full rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Neue Anfrage stellen
            </button>
          )}

          {changeRequests.length === 0 && !showCRForm && (
            <p className="text-sm text-gray-400 text-center -mt-1">Noch keine Anfragen gestellt.</p>
          )}
        </div>
      )}

      {/* ── Bewertung ── */}
      {activeTab === 'review' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 max-w-lg">
          {existingReview && reviewState?.status !== 'success' ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Deine Bewertung</p>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon key={star} filled={star <= existingReview.rating} />
                  ))}
                  <span className="ml-2 text-sm text-gray-500">{existingReview.rating}/5</span>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{existingReview.text}</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  existingReview.status === 'approved'
                    ? 'bg-green-50 text-green-700'
                    : existingReview.status === 'rejected'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {existingReview.status === 'approved' ? 'Veröffentlicht' : existingReview.status === 'rejected' ? 'Abgelehnt' : 'In Prüfung'}
                </span>
                <span className="text-xs text-gray-400">{formatDate(existingReview.created_at)}</span>
              </div>
              {existingReview.status === 'pending' && (
                <p className="text-xs text-gray-400 italic">
                  Deine Bewertung wird nach Überprüfung veröffentlicht. Du kannst sie noch bearbeiten.
                </p>
              )}
              {existingReview.status !== 'approved' && (
                <button
                  onClick={() => setSelectedRating(existingReview.rating)}
                  className="text-sm text-gray-500 underline hover:text-gray-700 transition-colors"
                >
                  Bewertung bearbeiten
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Projekt bewerten</h3>
                <p className="text-xs text-gray-400 mt-0.5">Dein Feedback hilft uns, besser zu werden.</p>
              </div>

              {reviewState?.status === 'success' && (
                <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                  Bewertung eingereicht! Sie wird nach Überprüfung veröffentlicht.
                </div>
              )}

              <form action={reviewAction} className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Sterne</p>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSelectedRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <StarIcon filled={star <= (hoverRating || selectedRating)} />
                      </button>
                    ))}
                    {selectedRating > 0 && (
                      <span className="ml-2 text-sm text-gray-500">{selectedRating}/5</span>
                    )}
                  </div>
                  <input type="hidden" name="rating" value={selectedRating} />
                </div>

                <div>
                  <label htmlFor="review-text" className="text-sm font-medium text-gray-700 block mb-1.5">
                    Dein Feedback
                  </label>
                  <textarea
                    id="review-text"
                    name="text"
                    rows={4}
                    required
                    disabled={reviewPending}
                    defaultValue={existingReview?.text ?? ''}
                    placeholder="Was hat dir besonders gut gefallen? Wo können wir uns verbessern?"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 resize-none"
                  />
                </div>

                {reviewState?.status === 'error' && (
                  <p className="text-sm text-red-600">{reviewState.message}</p>
                )}

                <button
                  type="submit"
                  disabled={reviewPending || selectedRating === 0}
                  className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {reviewPending ? 'Wird gesendet…' : existingReview ? 'Bewertung aktualisieren' : 'Bewertung einreichen'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
