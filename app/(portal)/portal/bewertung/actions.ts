'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type State = { status: 'error'; message: string } | { status: 'success'; message: string } | null

export async function submitReview(_prev: State, formData: FormData): Promise<State> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Nicht angemeldet.' }

  const projectId = formData.get('project_id') as string
  const ratingRaw = formData.get('rating') as string
  const text = (formData.get('text') as string)?.trim()

  if (!projectId) return { status: 'error', message: 'Kein Projekt ausgewählt.' }
  const rating = parseInt(ratingRaw, 10)
  if (!rating || rating < 1 || rating > 5) return { status: 'error', message: 'Bitte wähle eine Sternebewertung.' }
  if (!text || text.length < 20) return { status: 'error', message: 'Bitte schreibe mindestens 20 Zeichen.' }

  const [{ data: profile }, { data: client }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('clients').select('company_name').eq('profile_id', user.id).single(),
  ])

  const { error } = await supabase.from('reviews').insert({
    project_id: projectId,
    client_id: user.id,
    rating,
    text,
    reviewer_name: profile?.full_name ?? null,
    reviewer_company: client?.company_name ?? null,
  })

  if (error) {
    if (error.code === '23505') return { status: 'error', message: 'Du hast für dieses Projekt bereits eine Bewertung abgegeben.' }
    return { status: 'error', message: 'Fehler beim Speichern. Bitte versuche es erneut.' }
  }

  revalidatePath('/portal/bewertung')
  return { status: 'success', message: 'Danke! Deine Bewertung wurde eingereicht und wird geprüft.' }
}
