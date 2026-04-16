'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type ActionResult = { status: 'success' } | { status: 'error'; message: string }

// ── Nachricht senden (Client → Admin) ───────────────────────────────────────

export async function sendMessage(
  projectId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Nicht eingeloggt.' }

  const content = formData.get('content')
  if (!content || typeof content !== 'string' || !content.trim()) {
    return { status: 'error', message: 'Nachricht darf nicht leer sein.' }
  }

  const { error } = await supabase.from('messages').insert({
    project_id: projectId,
    sender_id: user.id,
    sender_role: 'client',
    content: content.trim(),
  })

  if (error) {
    console.error('[sendMessage]', error.message)
    return { status: 'error', message: 'Fehler beim Senden.' }
  }

  revalidatePath('/portal/project')
  return { status: 'success' }
}

// ── Änderungsanfrage einreichen ──────────────────────────────────────────────

export async function submitChangeRequest(
  projectId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Nicht eingeloggt.' }

  const title = formData.get('title')
  const description = formData.get('description')

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return { status: 'error', message: 'Titel zu kurz (mind. 3 Zeichen).' }
  }

  const { error } = await supabase.from('change_requests').insert({
    project_id: projectId,
    submitted_by: user.id,
    title: title.trim(),
    description: typeof description === 'string' && description.trim() ? description.trim() : null,
  })

  if (error) {
    console.error('[submitChangeRequest]', error.message)
    return { status: 'error', message: 'Fehler beim Speichern.' }
  }

  revalidatePath('/portal/project')
  return { status: 'success' }
}

// ── Bewertung einreichen / aktualisieren ─────────────────────────────────────

export async function submitReview(
  projectId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Nicht eingeloggt.' }

  const rating = parseInt((formData.get('rating') as string) ?? '0', 10)
  const text = formData.get('text')

  if (!rating || rating < 1 || rating > 5) {
    return { status: 'error', message: 'Bitte eine Bewertung (1–5 Sterne) auswählen.' }
  }
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return { status: 'error', message: 'Feedback zu kurz (mind. 10 Zeichen).' }
  }

  const { error } = await supabase.from('reviews').upsert(
    {
      project_id: projectId,
      client_id: user.id,
      rating,
      text: text.trim(),
      status: 'pending',
      published: false,
    },
    { onConflict: 'project_id,client_id' }
  )

  if (error) {
    console.error('[submitReview]', error.message)
    return { status: 'error', message: 'Fehler beim Speichern.' }
  }

  revalidatePath('/portal/project')
  return { status: 'success' }
}
