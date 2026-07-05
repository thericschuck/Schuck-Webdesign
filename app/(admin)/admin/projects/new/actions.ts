'use server'

import { redirect } from 'next/navigation'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { createProject as createProjectRecord } from '@/lib/domain/projects'
import type { ProjectStatus } from '@/types/database'

type ActionResult = { status: 'error'; message: string }

export async function createProject(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await assertAdmin()

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

  let project
  try {
    project = await createProjectRecord({
      clientId,
      title: title.trim(),
      description: typeof description === 'string' && description.trim() ? description.trim() : null,
      status: status || undefined,
      startDate: typeof startDate === 'string' && startDate ? startDate : null,
      launchDate: typeof launchDate === 'string' && launchDate ? launchDate : null,
    })
  } catch (error) {
    console.error('[createProject] error:', error instanceof Error ? error.message : error)
    return { status: 'error', message: error instanceof Error ? error.message : 'Fehler beim Anlegen des Projekts.' }
  }

  redirect(`/admin/projects/${project.id}`)
}
