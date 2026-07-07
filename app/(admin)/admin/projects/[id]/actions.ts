'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { ProjectStatus } from '@/types/database'
import { assertAdmin } from '@/lib/auth/assert-admin'
import {
  updateProject as updateProjectRecord,
  deleteProject as deleteProjectRecord,
  addProjectUpdate as addProjectUpdateRecord,
} from '@/lib/domain/projects'
import * as documentsDomain from '@/lib/domain/documents'
import type { DocumentTemplate } from '@/lib/domain/documents'

// ── Update Status ────────────────────────────────────────────────────────────

export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus
): Promise<void> {
  await assertAdmin()
  await updateProjectRecord(projectId, { status })

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
  await assertAdmin()

  const message = formData.get('message')
  if (!message || typeof message !== 'string') {
    return { status: 'error', message: 'Nachricht zu kurz.' }
  }

  try {
    await addProjectUpdateRecord(projectId, message)
  } catch (error) {
    console.error('[addProjectUpdate] error:', error instanceof Error ? error.message : error)
    return { status: 'error', message: error instanceof Error ? error.message : 'Fehler beim Speichern.' }
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

  const { data: meeting, error } = await supabase.from('meetings').insert({
    project_id: projectId,
    title: title.trim(),
    meeting_date: meetingDate,
    duration_minutes: duration,
    notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    action_items: actionItems,
  }).select('id').single()

  if (error) {
    console.error('[addMeeting]', error.message)
    return { status: 'error', message: 'Fehler beim Speichern.' }
  }

  if (actionItems.length > 0 && meeting) {
    await supabase.from('todos').insert(
      actionItems.map((item) => ({
        project_id: projectId,
        meeting_id: meeting.id,
        title: item,
        priority: 'medium' as const,
      }))
    )
  }

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath('/admin/todos')
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
  await assertAdmin()

  try {
    const result = await deleteProjectRecord(projectId)
    return { status: 'success', clientId: result.clientId }
  } catch (error) {
    console.error('[deleteProject]', error instanceof Error ? error.message : error)
    const message = error instanceof Error ? error.message : 'Fehler beim Löschen des Projekts.'
    return { status: 'error', message }
  }
}

// ── Admin File Upload ────────────────────────────────────────────────────────

type UploadResult = { status: 'success'; fileName: string } | { status: 'error'; message: string }

export async function adminUploadFile(
  _prev: UploadResult | null,
  formData: FormData
): Promise<UploadResult> {
  const supabase = await assertAdmin()
  const { data: { user } } = await supabase.auth.getUser()

  const file = formData.get('file') as File | null
  const projectId = formData.get('project_id') as string
  const clientId = formData.get('client_id') as string
  const folder = (formData.get('folder') as string | null)?.trim() || null

  if (!file || file.size === 0) return { status: 'error', message: 'Bitte eine Datei auswählen.' }

  try {
    const doc = await documentsDomain.uploadDocumentFile({
      file,
      clientId,
      projectId,
      folder,
      uploadedBy: user!.id,
    })

    revalidatePath(`/admin/projects/${projectId}`)
    return { status: 'success', fileName: doc.name }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Upload fehlgeschlagen.' }
  }
}

export async function editProjectUpdate(
  _prev: AddUpdateResult | null,
  formData: FormData
): Promise<AddUpdateResult> {
  const supabase = await assertAdmin()
  const updateId = formData.get('update_id') as string
  const projectId = formData.get('project_id') as string
  const message = formData.get('message')

  if (!message || typeof message !== 'string' || message.trim().length < 3) {
    return { status: 'error', message: 'Nachricht zu kurz.' }
  }

  const { error } = await supabase
    .from('project_updates')
    .update({ message: message.trim() })
    .eq('id', updateId)

  if (error) return { status: 'error', message: 'Fehler beim Speichern.' }

  revalidatePath(`/admin/projects/${projectId}`)
  return { status: 'success' }
}

export async function editMeeting(
  _prev: AddMeetingResult | null,
  formData: FormData
): Promise<AddMeetingResult> {
  const supabase = await assertAdmin()
  const meetingId = formData.get('meeting_id') as string
  const projectId = formData.get('project_id') as string
  const title = formData.get('title')
  const meetingDate = formData.get('meeting_date')
  const durationRaw = formData.get('duration_minutes')
  const notes = formData.get('notes')
  const actionItemsRaw = formData.get('action_items')

  if (!title || typeof title !== 'string' || title.trim().length < 2) {
    return { status: 'error', message: 'Titel ist erforderlich.' }
  }
  if (!meetingDate || typeof meetingDate !== 'string') {
    return { status: 'error', message: 'Datum ist erforderlich.' }
  }

  const duration = durationRaw && String(durationRaw).trim()
    ? parseInt(String(durationRaw), 10)
    : null

  const actionItems = typeof actionItemsRaw === 'string' && actionItemsRaw.trim()
    ? actionItemsRaw.split('\n').map((s) => s.trim()).filter(Boolean)
    : []

  const { error } = await supabase.from('meetings').update({
    title: title.trim(),
    meeting_date: meetingDate,
    duration_minutes: duration,
    notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    action_items: actionItems,
  }).eq('id', meetingId)

  if (error) return { status: 'error', message: 'Fehler beim Speichern.' }

  // Sync todos: delete undone meeting-todos, recreate from current action_items
  // (done todos are preserved even if the action item was changed)
  await supabase.from('todos').delete().eq('meeting_id', meetingId).eq('done', false)

  if (actionItems.length > 0) {
    await supabase.from('todos').insert(
      actionItems.map((item) => ({
        project_id: projectId,
        meeting_id: meetingId,
        title: item,
        priority: 'medium' as const,
      }))
    )
  }

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath('/admin/todos')
  return { status: 'success' }
}

export async function moveDocument(formData: FormData): Promise<void> {
  await assertAdmin()
  const adminClient = createAdminClient()
  const documentId = formData.get('document_id') as string
  const projectId = formData.get('project_id') as string
  const targetFolder = (formData.get('target_folder') as string | null)?.trim() || null

  await adminClient
    .from('documents')
    .update({ folder: targetFolder })
    .eq('id', documentId)

  revalidatePath(`/admin/projects/${projectId}`)
}

export async function getAdminDownloadUrl(fileUrl: string): Promise<string | null> {
  const supabase = await assertAdmin()
  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(fileUrl, 3600)
  return data?.signedUrl ?? null
}

export async function adminDeleteFile(formData: FormData): Promise<void> {
  await assertAdmin()
  const adminClient = createAdminClient()

  const fileUrl = formData.get('file_url') as string
  const documentId = formData.get('document_id') as string
  const projectId = formData.get('project_id') as string

  await adminClient.storage.from('documents').remove([fileUrl])
  await adminClient.from('documents').delete().eq('id', documentId)

  revalidatePath(`/admin/projects/${projectId}`)
}

// ── Update Project Meta ──────────────────────────────────────────────────────

type UpdateMetaResult = { status: 'error'; message: string }

export async function updateProjectMeta(
  projectId: string,
  _prev: UpdateMetaResult | null,
  formData: FormData
): Promise<UpdateMetaResult> {
  await assertAdmin()

  const title = formData.get('title')
  const description = formData.get('description')
  const startDate = formData.get('start_date')
  const launchDate = formData.get('launch_date')

  if (!title || typeof title !== 'string' || title.trim().length < 2) {
    return { status: 'error', message: 'Titel ist erforderlich.' }
  }

  try {
    await updateProjectRecord(projectId, {
      title: title.trim(),
      description: typeof description === 'string' && description.trim() ? description.trim() : null,
      start_date: typeof startDate === 'string' && startDate ? startDate : null,
      launch_date: typeof launchDate === 'string' && launchDate ? launchDate : null,
    })
  } catch {
    return { status: 'error', message: 'Fehler beim Speichern.' }
  }

  revalidatePath(`/admin/projects/${projectId}`)
  redirect(`/admin/projects/${projectId}`)
}

// ── Update Launch Date only ───────────────────────────────────────────────────

export async function updateLaunchDate(
  projectId: string,
  _prev: { status: 'success' } | { status: 'error'; message: string } | null,
  formData: FormData
): Promise<{ status: 'success' } | { status: 'error'; message: string }> {
  await assertAdmin()

  const raw = formData.get('launch_date')
  const launchDate = typeof raw === 'string' && raw ? raw : null

  try {
    await updateProjectRecord(projectId, { launch_date: launchDate })
  } catch {
    return { status: 'error', message: 'Fehler beim Speichern.' }
  }

  revalidatePath(`/admin/projects/${projectId}`)
  return { status: 'success' }
}

// ── Todos ─────────────────────────────────────────────────────────────────────

type TodoResult = { status: 'error'; message: string } | { status: 'success' }

export async function addTodo(
  _prev: TodoResult | null,
  formData: FormData
): Promise<TodoResult> {
  const supabase = await assertAdmin()
  const projectIdRaw = formData.get('project_id')
  const projectId = typeof projectIdRaw === 'string' && projectIdRaw.trim() ? projectIdRaw.trim() : null
  const title = formData.get('title')
  const priority = ((formData.get('priority') as string) || 'medium') as 'high' | 'medium' | 'low'
  const dueDateRaw = formData.get('due_date')
  const dueDate = typeof dueDateRaw === 'string' && dueDateRaw.trim() ? dueDateRaw : null

  if (!title || typeof title !== 'string' || title.trim().length < 1) {
    return { status: 'error', message: 'Titel erforderlich.' }
  }
  if (!['high', 'medium', 'low'].includes(priority)) {
    return { status: 'error', message: 'Ungültige Priorität.' }
  }

  const { error } = await supabase.from('todos').insert({
    project_id: projectId,
    title: title.trim(),
    priority,
    due_date: dueDate,
  })

  if (error) return { status: 'error', message: 'Fehler beim Speichern.' }
  if (projectId) revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath('/admin/todos')
  return { status: 'success' }
}

export async function editTodo(
  _prev: TodoResult | null,
  formData: FormData
): Promise<TodoResult> {
  const supabase = await assertAdmin()
  const todoId = formData.get('todo_id') as string
  const projectId = formData.get('project_id') as string
  const title = formData.get('title')
  const priority = ((formData.get('priority') as string) || 'medium') as 'high' | 'medium' | 'low'
  const dueDateRaw = formData.get('due_date')
  const dueDate = typeof dueDateRaw === 'string' && dueDateRaw.trim() ? dueDateRaw : null

  if (!title || typeof title !== 'string' || title.trim().length < 1) {
    return { status: 'error', message: 'Titel erforderlich.' }
  }

  const { error } = await supabase
    .from('todos')
    .update({ title: title.trim(), priority, due_date: dueDate })
    .eq('id', todoId)

  if (error) return { status: 'error', message: 'Fehler beim Speichern.' }
  revalidatePath(`/admin/projects/${projectId}`)
  return { status: 'success' }
}

// ── Dokumente erstellen/senden ───────────────────────────────────────────────

type GenerateDocumentResult =
  | { status: 'error'; message: string }
  | { status: 'success'; documentId: string; name: string }

export async function generateDocumentAction(
  projectId: string,
  clientId: string,
  template: DocumentTemplate,
  offerId: string | null
): Promise<GenerateDocumentResult> {
  await assertAdmin()

  try {
    const doc = await documentsDomain.generateDocument({ template, clientId, projectId, offerId })
    revalidatePath(`/admin/projects/${projectId}`)
    return { status: 'success', documentId: doc.id, name: doc.name }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Dokument konnte nicht erstellt werden.' }
  }
}

type SendDocumentResult = { status: 'error'; message: string } | { status: 'success' }

export async function sendDocumentAction(
  projectId: string,
  documentId: string,
  to: string,
  subject: string | null
): Promise<SendDocumentResult> {
  await assertAdmin()

  try {
    await documentsDomain.sendDocument({ documentId, to, subject: subject ?? undefined })
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Dokument konnte nicht gesendet werden.' }
  }

  revalidatePath(`/admin/projects/${projectId}`)
  return { status: 'success' }
}

export async function toggleTodo(formData: FormData): Promise<void> {
  const supabase = await assertAdmin()
  const todoId = formData.get('todo_id') as string
  const projectIdRaw = formData.get('project_id')
  const projectId = typeof projectIdRaw === 'string' && projectIdRaw.trim() ? projectIdRaw.trim() : null
  const done = formData.get('done') === 'true'

  await supabase.from('todos').update({ done: !done }).eq('id', todoId)
  if (projectId) revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath('/admin/todos')
}

export async function deleteTodo(formData: FormData): Promise<void> {
  const supabase = await assertAdmin()
  const todoId = formData.get('todo_id') as string
  const projectIdRaw = formData.get('project_id')
  const projectId = typeof projectIdRaw === 'string' && projectIdRaw.trim() ? projectIdRaw.trim() : null

  await supabase.from('todos').delete().eq('id', todoId)
  if (projectId) revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath('/admin/todos')
}
