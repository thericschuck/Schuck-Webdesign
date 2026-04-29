'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { ProjectStatus } from '@/types/database'

async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/portal')
  return supabase
}

// ── Update Status ────────────────────────────────────────────────────────────

export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus
): Promise<void> {
  const supabase = await assertAdmin()

  const { error } = await supabase
    .from('projects')
    .update({ status })
    .eq('id', projectId)

  if (error) throw new Error(error.message)

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath('/admin/projects')
  revalidatePath('/admin/dashboard')
}

// ── Add Update ───────────────────────────────────────────────────────────────

type AddUpdateResult = { status: 'error'; message: string } | { status: 'success' }

export async function addProjectUpdate(
  projectId: string,
  _prev: AddUpdateResult | null,
  formData: FormData
): Promise<AddUpdateResult> {
  const supabase = await assertAdmin()

  const message = formData.get('message')
  if (!message || typeof message !== 'string' || message.trim().length < 3) {
    return { status: 'error', message: 'Nachricht zu kurz.' }
  }

  const { error } = await supabase.from('project_updates').insert({
    project_id: projectId,
    message: message.trim(),
  })

  if (error) {
    console.error('[addProjectUpdate] error:', error.message)
    return { status: 'error', message: 'Fehler beim Speichern.' }
  }

  revalidatePath(`/admin/projects/${projectId}`)
  return { status: 'success' }
}

// ── Delete Update ────────────────────────────────────────────────────────────

export async function deleteProjectUpdate(
  projectId: string,
  updateId: string
): Promise<void> {
  const supabase = await assertAdmin()

  await supabase.from('project_updates').delete().eq('id', updateId)

  revalidatePath(`/admin/projects/${projectId}`)
}

// Form-based variant for use in Client Components
export async function deleteUpdate(formData: FormData): Promise<void> {
  const supabase = await assertAdmin()
  const updateId = formData.get('update_id') as string
  const projectId = formData.get('project_id') as string

  await supabase.from('project_updates').delete().eq('id', updateId)
  revalidatePath(`/admin/projects/${projectId}`)
}

// ── Meetings ─────────────────────────────────────────────────────────────────

type AddMeetingResult = { status: 'error'; message: string } | { status: 'success' }

export async function addMeeting(
  _prev: AddMeetingResult | null,
  formData: FormData
): Promise<AddMeetingResult> {
  const supabase = await assertAdmin()

  const projectId = formData.get('project_id') as string
  const title = formData.get('title')
  const meetingDate = formData.get('meeting_date')
  const durationRaw = formData.get('duration_minutes')
  const notes = formData.get('notes')
  const actionItemsRaw = formData.get('action_items')

  if (!title || typeof title !== 'string' || title.trim().length < 2) {
    return { status: 'error', message: 'Titel ist erforderlich.' }
  }
  if (!meetingDate || typeof meetingDate !== 'string' || !meetingDate) {
    return { status: 'error', message: 'Datum ist erforderlich.' }
  }

  const duration = durationRaw && String(durationRaw).trim()
    ? parseInt(String(durationRaw), 10)
    : null

  const actionItems = typeof actionItemsRaw === 'string' && actionItemsRaw.trim()
    ? actionItemsRaw.split('\n').map((s) => s.trim()).filter(Boolean)
    : []

  const { error } = await supabase.from('meetings').insert({
    project_id: projectId,
    title: title.trim(),
    meeting_date: meetingDate,
    duration_minutes: duration,
    notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    action_items: actionItems,
  })

  if (error) {
    console.error('[addMeeting]', error.message)
    return { status: 'error', message: 'Fehler beim Speichern.' }
  }

  revalidatePath(`/admin/projects/${projectId}`)
  return { status: 'success' }
}

export async function deleteMeeting(formData: FormData): Promise<void> {
  const supabase = await assertAdmin()
  const meetingId = formData.get('meeting_id') as string
  const projectId = formData.get('project_id') as string

  await supabase.from('meetings').delete().eq('id', meetingId)
  revalidatePath(`/admin/projects/${projectId}`)
}

// ── Change Requests ───────────────────────────────────────────────────────────

export async function saveRequestNote(formData: FormData): Promise<void> {
  const supabase = await assertAdmin()
  const requestId = formData.get('request_id') as string
  const projectId = formData.get('project_id') as string
  const notes = formData.get('admin_notes') as string | null

  await supabase
    .from('change_requests')
    .update({ admin_notes: notes?.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', requestId)

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath('/portal/project')
}

export async function updateChangeRequestStatus(formData: FormData): Promise<void> {
  const supabase = await assertAdmin()
  const requestId = formData.get('request_id') as string
  const projectId = formData.get('project_id') as string
  const status = formData.get('status') as 'open' | 'in_progress' | 'done' | 'rejected'

  if (!['open', 'in_progress', 'done', 'rejected'].includes(status)) return

  await supabase
    .from('change_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId)

  revalidatePath(`/admin/projects/${projectId}`)
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export async function approveReview(formData: FormData): Promise<void> {
  const supabase = await assertAdmin()
  const reviewId = formData.get('review_id') as string
  const projectId = formData.get('project_id') as string

  await supabase
    .from('reviews')
    .update({ status: 'approved', approved_at: new Date().toISOString(), published: true })
    .eq('id', reviewId)

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath('/admin/dashboard')
}

export async function rejectReview(formData: FormData): Promise<void> {
  const supabase = await assertAdmin()
  const reviewId = formData.get('review_id') as string
  const projectId = formData.get('project_id') as string

  await supabase
    .from('reviews')
    .update({ status: 'rejected', published: false })
    .eq('id', reviewId)

  revalidatePath(`/admin/projects/${projectId}`)
}

// ── Delete Project ───────────────────────────────────────────────────────────

type DeleteProjectResult = { status: 'error'; message: string } | { status: 'success'; clientId: string }

export async function deleteProject(projectId: string): Promise<DeleteProjectResult> {
  const supabase = await assertAdmin()

  const { data: project } = await supabase
    .from('projects')
    .select('client_id')
    .eq('id', projectId)
    .single()

  if (!project) {
    return { status: 'error', message: 'Projekt nicht gefunden.' }
  }

  // messages und change_requests referenzieren auth.users direkt (kein ON DELETE CASCADE) –
  // vorab löschen, damit die Projekt-Löschung nicht durch FK-Constraints blockiert wird.
  await supabase.from('messages').delete().eq('project_id', projectId)
  await supabase.from('change_requests').delete().eq('project_id', projectId)
  await supabase.from('reviews').delete().eq('project_id', projectId)

  const { error } = await supabase.from('projects').delete().eq('id', projectId)

  if (error) {
    console.error('[deleteProject]', error.message)
    return { status: 'error', message: 'Fehler beim Löschen des Projekts.' }
  }

  return { status: 'success', clientId: project.client_id }
}

// ── Update Project Meta ──────────────────────────────────────────────────────

type UpdateMetaResult = { status: 'error'; message: string }

export async function updateProjectMeta(
  projectId: string,
  _prev: UpdateMetaResult | null,
  formData: FormData
): Promise<UpdateMetaResult> {
  const supabase = await assertAdmin()

  const title = formData.get('title')
  const description = formData.get('description')
  const startDate = formData.get('start_date')
  const launchDate = formData.get('launch_date')

  if (!title || typeof title !== 'string' || title.trim().length < 2) {
    return { status: 'error', message: 'Titel ist erforderlich.' }
  }

  const { error } = await supabase
    .from('projects')
    .update({
      title: title.trim(),
      description: typeof description === 'string' && description.trim() ? description.trim() : null,
      start_date: typeof startDate === 'string' && startDate ? startDate : null,
      launch_date: typeof launchDate === 'string' && launchDate ? launchDate : null,
    })
    .eq('id', projectId)

  if (error) {
    return { status: 'error', message: 'Fehler beim Speichern.' }
  }

  revalidatePath(`/admin/projects/${projectId}`)
  redirect(`/admin/projects/${projectId}`)
}
