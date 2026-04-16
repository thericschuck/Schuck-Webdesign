'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { ProjectStatus } from '@/types/database'

type ActionResult = { status: 'error'; message: string }

export async function createProject(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
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
  if (profile?.role !== 'admin') {
    return { status: 'error', message: 'Keine Berechtigung.' }
  }

  const clientId = formData.get('client_id')
  const title = formData.get('title')
  const description = formData.get('description')
  const status = formData.get('status') as ProjectStatus
  const startDate = formData.get('start_date')
  const launchDate = formData.get('launch_date')

  if (!clientId || typeof clientId !== 'string') {
    return { status: 'error', message: 'Bitte einen Kunden auswählen.' }
  }
  if (!title || typeof title !== 'string' || title.trim().length < 2) {
    return { status: 'error', message: 'Bitte einen Projekttitel eingeben.' }
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      client_id: clientId,
      title: title.trim(),
      description: typeof description === 'string' && description.trim() ? description.trim() : null,
      status: status ?? 'briefing',
      start_date: typeof startDate === 'string' && startDate ? startDate : null,
      launch_date: typeof launchDate === 'string' && launchDate ? launchDate : null,
    })
    .select('id')
    .single()

  if (error || !project) {
    console.error('[createProject] error:', error?.message)
    return { status: 'error', message: 'Fehler beim Anlegen des Projekts.' }
  }

  redirect(`/admin/projects/${project.id}`)
}
