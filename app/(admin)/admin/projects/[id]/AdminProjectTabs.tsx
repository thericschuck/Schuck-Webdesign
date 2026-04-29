'use client'

import { useActionState, useState, useRef, useEffect } from 'react'
import {
  addMeeting,
  deleteMeeting,
  updateChangeRequestStatus,
  saveRequestNote,
  approveReview,
  rejectReview,
  deleteUpdate,
} from './actions'
import { AddUpdateForm } from './AddUpdateForm'
import { AdminFileExplorer } from './AdminFileExplorer'

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
  submitted_by: string
  created_at: string
}
type Review = {
  id: string
  client_id: string | null
  rating: number
  text: string
  status: 'pending' | 'approved' | 'rejected'
  approved_at: string | null
  published: boolean
  created_at: string
}

type DocRow = {
  id: string
  name: string
  file_url: string
  folder: string | null
  created_at: string
  signedUrl: string | null
}

type Props = {
  projectId: string
  clientId: string
  adminId: string
  updates: Update[]
  meetings: Meeting[]
  changeRequests: ChangeRequest[]
  reviews: Review[]
  documents: DocRow[]
}

const TABS = [
  { id: 'updates' as const, label: 'Updates' },
  { id: 'meetings' as const, label: 'Besprechungen' },
  { id: 'requests' as const, label: 'Anfragen' },
  { id: 'reviews' as const, label: 'Bewertungen' },
  { id: 'files' as const, label: 'Dateien' },
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

export function AdminProjectTabs({
  projectId, clientId, adminId, updates, meetings, changeRequests, reviews, documents,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('updates')
  const [showMeetingForm, setShowMeetingForm] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)

  // Add meeting
  const [meetingState, meetingAction, meetingPending] = useActionState<ActionResult | null, FormData>(addMeeting, null)
  const meetingFormRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (meetingState?.status === 'success') {
      meetingFormRef.current?.reset()
      setShowMeetingForm(false)
    }
  }, [meetingState])

  const pendingReviews = reviews.filter((r) => r.status === 'pending').length
  const openRequests = changeRequests.filter((cr) => cr.status === 'open' || cr.status === 'in_progress').length

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-100 mb-5 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-700',
            ].join(' ')}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {tab.label}
            {tab.id === 'reviews' && pendingReviews > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full leading-none">
                {pendingReviews}
              </span>
            )}
            {tab.id === 'requests' && openRequests > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full leading-none">
                {openRequests}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Updates ── */}
      {activeTab === 'updates' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Update posten
            </h3>
            <AddUpdateForm projectId={projectId} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Verlauf ({updates.length})
              </h3>
            </div>
            {updates.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {updates.map((u) => (
                  <div key={u.id} className="px-5 py-4 flex items-start gap-3 group">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4-1-4z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {u.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {formatDateTime(u.created_at)}
                      </p>
                    </div>
                    <form action={deleteUpdate}>
                      <input type="hidden" name="update_id" value={u.id} />
                      <input type="hidden" name="project_id" value={projectId} />
                      <button
                        type="submit"
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
                        title="Update löschen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Noch keine Updates.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Besprechungen ── */}
      {activeTab === 'meetings' && (
        <div className="flex flex-col gap-4">
          {/* Add meeting form */}
          {showMeetingForm ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Neue Besprechung
              </h3>
              <form ref={meetingFormRef} action={meetingAction} className="flex flex-col gap-3">
                <input type="hidden" name="project_id" value={projectId} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500 block mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      Titel *
                    </label>
                    <input
                      name="title"
                      type="text"
                      required
                      disabled={meetingPending}
                      placeholder="z.B. Kickoff-Meeting"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50"
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      Datum *
                    </label>
                    <input
                      name="meeting_date"
                      type="date"
                      required
                      disabled={meetingPending}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50"
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      Dauer (Min.)
                    </label>
                    <input
                      name="duration_minutes"
                      type="number"
                      min={1}
                      disabled={meetingPending}
                      placeholder="60"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50"
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500 block mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      Notizen
                    </label>
                    <textarea
                      name="notes"
                      rows={3}
                      disabled={meetingPending}
                      placeholder="Besprochene Themen, Entscheidungen…"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 resize-none"
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500 block mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      Aufgaben <span className="font-normal">(eine pro Zeile)</span>
                    </label>
                    <textarea
                      name="action_items"
                      rows={3}
                      disabled={meetingPending}
                      placeholder={'Logo-Varianten bis Freitag liefern\nFeedback-Runde vereinbaren'}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 resize-none font-mono"
                    />
                  </div>
                </div>

                {meetingState?.status === 'error' && (
                  <p className="text-sm text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {meetingState.message}
                  </p>
                )}

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowMeetingForm(false)}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={meetingPending}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    {meetingPending ? 'Speichern…' : 'Speichern'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setShowMeetingForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors self-start"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Besprechung hinzufügen
            </button>
          )}

          {/* Meetings list */}
          {meetings.length === 0 ? (
            !showMeetingForm && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-10 text-center">
                <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Noch keine Besprechungen.
                </p>
              </div>
            )
          ) : (
            <div className="flex flex-col gap-3">
              {meetings.map((m) => {
                const items = Array.isArray(m.action_items) ? (m.action_items as string[]) : []
                return (
                  <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {m.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {formatDate(m.meeting_date)}
                          {m.duration_minutes ? ` · ${m.duration_minutes} Min.` : ''}
                        </p>
                      </div>
                      <form action={deleteMeeting}>
                        <input type="hidden" name="meeting_id" value={m.id} />
                        <input type="hidden" name="project_id" value={projectId} />
                        <button
                          type="submit"
                          className="text-gray-300 hover:text-red-500 transition-colors p-1"
                          title="Besprechung löschen"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </form>
                    </div>
                    {m.notes && (
                      <p className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {m.notes}
                      </p>
                    )}
                    {items.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          Aufgaben
                        </p>
                        <ul className="space-y-1.5">
                          {items.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                              <span className="mt-0.5 w-4 h-4 rounded border border-gray-300 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Anfragen ── */}
      {activeTab === 'requests' && (
        <div className="flex flex-col gap-3">
          {changeRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-10 text-center">
              <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Noch keine Anfragen.
              </p>
            </div>
          ) : (
            changeRequests.map((cr) => (
              <div key={cr.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {cr.title}
                    </p>
                    {cr.description && (
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {cr.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {formatDateTime(cr.created_at)}
                    </p>
                  </div>
                  <form action={updateChangeRequestStatus} className="flex items-center gap-2 shrink-0">
                    <input type="hidden" name="request_id" value={cr.id} />
                    <input type="hidden" name="project_id" value={projectId} />
                    <select
                      name="status"
                      defaultValue={cr.status}
                      className={`text-xs px-2.5 py-1.5 rounded-xl border font-medium outline-none focus:ring-2 focus:ring-gray-100 cursor-pointer ${CR_COLOR[cr.status]} border-transparent`}
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                      onChange={(e) => e.currentTarget.form?.requestSubmit()}
                    >
                      <option value="open">Offen</option>
                      <option value="in_progress">In Bearbeitung</option>
                      <option value="done">Erledigt</option>
                      <option value="rejected">Abgelehnt</option>
                    </select>
                  </form>
                </div>

                {/* Admin note / reply */}
                {editingNoteId === cr.id ? (
                  <form action={saveRequestNote} onSubmit={() => setEditingNoteId(null)} className="flex flex-col gap-2 pt-2 border-t border-gray-50">
                    <input type="hidden" name="request_id" value={cr.id} />
                    <input type="hidden" name="project_id" value={projectId} />
                    <textarea
                      name="admin_notes"
                      defaultValue={cr.admin_notes ?? ''}
                      rows={3}
                      autoFocus
                      placeholder="Antwort / interne Notiz für den Kunden…"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 resize-none"
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingNoteId(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-3 py-1.5"
                        style={{ fontFamily: 'var(--font-dm-sans)' }}
                      >
                        Abbrechen
                      </button>
                      <button
                        type="submit"
                        className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
                        style={{ fontFamily: 'var(--font-dm-sans)' }}
                      >
                        Speichern
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="pt-2 border-t border-gray-50">
                    {cr.admin_notes ? (
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                            Deine Antwort
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                            {cr.admin_notes}
                          </p>
                        </div>
                        <button
                          onClick={() => setEditingNoteId(cr.id)}
                          className="text-xs text-gray-400 hover:text-gray-700 underline shrink-0 transition-colors"
                          style={{ fontFamily: 'var(--font-dm-sans)' }}
                        >
                          Bearbeiten
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingNoteId(cr.id)}
                        className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
                        style={{ fontFamily: 'var(--font-dm-sans)' }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Antworten
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Dateien ── */}
      {activeTab === 'files' && (
        <AdminFileExplorer
          projectId={projectId}
          clientId={clientId}
          documents={documents}
        />
      )}

      {/* ── Bewertungen ── */}
      {activeTab === 'reviews' && (
        <div className="flex flex-col gap-3">
          {reviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-10 text-center">
              <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Noch keine Bewertungen.
              </p>
            </div>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-5 h-5 ${star <= r.rating ? 'text-amber-400' : 'text-gray-200'}`}
                          fill="currentColor" viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="text-sm text-gray-500 ml-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {r.rating}/5
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {r.text}
                    </p>
                    <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {formatDateTime(r.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium text-center ${
                      r.status === 'approved' ? 'bg-green-50 text-green-700' :
                      r.status === 'rejected' ? 'bg-gray-100 text-gray-500' :
                      'bg-amber-50 text-amber-700'
                    }`} style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {r.status === 'approved' ? 'Freigegeben' : r.status === 'rejected' ? 'Abgelehnt' : 'Ausstehend'}
                    </span>
                    {r.status === 'pending' && (
                      <div className="flex gap-1.5">
                        <form action={approveReview}>
                          <input type="hidden" name="review_id" value={r.id} />
                          <input type="hidden" name="project_id" value={projectId} />
                          <button
                            type="submit"
                            className="text-xs px-2.5 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                            style={{ fontFamily: 'var(--font-dm-sans)' }}
                          >
                            Freigeben
                          </button>
                        </form>
                        <form action={rejectReview}>
                          <input type="hidden" name="review_id" value={r.id} />
                          <input type="hidden" name="project_id" value={projectId} />
                          <button
                            type="submit"
                            className="text-xs px-2.5 py-1 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            style={{ fontFamily: 'var(--font-dm-sans)' }}
                          >
                            Ablehnen
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
