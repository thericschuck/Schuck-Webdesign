import { createAdminClient } from '@/lib/supabase/admin'
import { DomainError } from './errors'
import { addNode as addKnowledgeNode } from './knowledge'
import type { Database, Project, ProjectStatus } from '@/types/database'

type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export const PROJECT_STATUS_VALUES: ProjectStatus[] = [
  'briefing',
  'design',
  'development',
  'review',
  'live',
]

const UPDATABLE_PROJECT_FIELDS = [
  'title',
  'description',
  'status',
  'start_date',
  'launch_date',
  'live_url',
  'internal_notes',
] as const

export interface ProjectDetail extends Project {
  updates: { id: string; message: string; created_at: string }[]
  todos: { id: string; title: string; done: boolean; priority: string; due_date: string | null }[]
  meetings: { id: string; title: string; meeting_date: string; notes: string | null; action_items: unknown }[]
}

export interface ListProjectsFilter {
  clientId?: string
  status?: ProjectStatus
}

export async function listProjects(filter: ListProjectsFilter = {}): Promise<Project[]> {
  const adminClient = createAdminClient()
  let query = adminClient.from('projects').select('*').order('created_at', { ascending: false })

  if (filter.clientId) query = query.eq('client_id', filter.clientId)
  if (filter.status) query = query.eq('status', filter.status)

  const { data, error } = await query
  if (error) throw new DomainError(error.message)
  return data
}

export async function getProject(projectId: string): Promise<ProjectDetail> {
  const adminClient = createAdminClient()

  const [
    { data: project, error: projectError },
    { data: updates, error: updatesError },
    { data: todos, error: todosError },
    { data: meetings, error: meetingsError },
  ] = await Promise.all([
    adminClient.from('projects').select('*').eq('id', projectId).single(),
    adminClient
      .from('project_updates')
      .select('id, message, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    adminClient
      .from('todos')
      .select('id, title, done, priority, due_date')
      .eq('project_id', projectId)
      .order('due_date', { ascending: true, nullsFirst: false }),
    adminClient
      .from('meetings')
      .select('id, title, meeting_date, notes, action_items')
      .eq('project_id', projectId)
      .order('meeting_date', { ascending: false }),
  ])

  if (projectError) throw new DomainError('Projekt nicht gefunden.')
  if (updatesError) throw new DomainError(updatesError.message)
  if (todosError) throw new DomainError(todosError.message)
  if (meetingsError) throw new DomainError(meetingsError.message)

  return { ...project, updates: updates ?? [], todos: todos ?? [], meetings: meetings ?? [] }
}

export interface CreateProjectInput {
  clientId: string
  title: string
  description?: string | null
  status?: ProjectStatus
  startDate?: string | null
  launchDate?: string | null
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const title = input.title.trim()
  if (!title) throw new DomainError('Projekttitel ist erforderlich.')

  const status = input.status ?? 'briefing'
  if (!PROJECT_STATUS_VALUES.includes(status)) {
    throw new DomainError(`Ungültiger Status "${status}".`)
  }

  const adminClient = createAdminClient()

  const { data: client, error: clientError } = await adminClient
    .from('clients')
    .select('client_number')
    .eq('id', input.clientId)
    .single()

  if (clientError || !client) throw new DomainError('Kunde nicht gefunden.')
  if (!client.client_number) {
    throw new DomainError('Kunde hat keine KD-Nummer. Bitte zuerst die Nummern-Migration/Backfill ausführen.')
  }

  const { data: seq, error: seqError } = await adminClient.rpc('get_next_number', {
    p_typ: 'PRJ',
    p_scope: client.client_number,
  })
  if (seqError) throw new DomainError(seqError.message)
  // Eigener PRJ-Nummernkreis statt der KD-Nummer des Kunden — der Kunden-Bezug bleibt über die
  // fortlaufende Ziffer je Kunde erhalten (Scope der Sequenz ist client_number), aber das Präfix
  // ist "PRJ", nicht "KD" (Projekte sind kein Kunden-Datensatz).
  const clientNumberSuffix = client.client_number.replace(/^KD-/, '')
  const projectNumber = `PRJ-${clientNumberSuffix}-${String(seq).padStart(3, '0')}`

  const { data: project, error } = await adminClient
    .from('projects')
    .insert({
      client_id: input.clientId,
      title,
      project_number: projectNumber,
      description: input.description ?? null,
      status,
      start_date: input.startDate ?? null,
      launch_date: input.launchDate ?? null,
    })
    .select('*')
    .single()

  if (error) throw new DomainError(`Projekt konnte nicht gespeichert werden: ${error.message}`)

  try {
    await addKnowledgeNode({
      type: 'project',
      label: project.title,
      body: project.description ?? null,
      refId: project.id,
      refTable: 'projects',
      source: 'jarvis_auto',
    })
  } catch (error) {
    console.error('[projects] Knowledge-Node konnte nicht angelegt werden:', error instanceof Error ? error.message : error)
  }

  return project
}

export interface UpdateProjectInput {
  title?: string
  description?: string | null
  status?: ProjectStatus
  start_date?: string | null
  launch_date?: string | null
  live_url?: string | null
  internal_notes?: string | null
}

export async function updateProject(projectId: string, patch: UpdateProjectInput): Promise<Project> {
  const updates: Record<string, unknown> = {}
  for (const key of UPDATABLE_PROJECT_FIELDS) {
    if (patch[key] !== undefined) updates[key] = patch[key]
  }

  if (Object.keys(updates).length === 0) {
    throw new DomainError('Keine Felder zum Aktualisieren angegeben.')
  }
  if (updates.title !== undefined && !String(updates.title).trim()) {
    throw new DomainError('Projekttitel ist erforderlich.')
  }
  if (updates.status !== undefined && !PROJECT_STATUS_VALUES.includes(updates.status as ProjectStatus)) {
    throw new DomainError(`Ungültiger Status "${updates.status}".`)
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('projects')
    .update(updates as ProjectUpdate)
    .eq('id', projectId)
    .select('*')
    .single()

  if (error) throw new DomainError(error.message)
  return data
}

export interface DeleteProjectResult {
  title: string
  clientId: string
}

export async function deleteProject(projectId: string): Promise<DeleteProjectResult> {
  const adminClient = createAdminClient()

  const { data: project } = await adminClient
    .from('projects')
    .select('title, client_id')
    .eq('id', projectId)
    .single()

  if (!project) throw new DomainError('Projekt nicht gefunden.')

  await adminClient.from('messages').delete().eq('project_id', projectId)
  await adminClient.from('change_requests').delete().eq('project_id', projectId)
  await adminClient.from('reviews').delete().eq('project_id', projectId)

  const { error } = await adminClient.from('projects').delete().eq('id', projectId)
  if (error) throw new DomainError(`Fehler beim Löschen: ${error.message}`)

  return { title: project.title, clientId: project.client_id }
}

export async function addProjectUpdate(projectId: string, message: string) {
  const trimmed = message.trim()
  if (trimmed.length < 3) throw new DomainError('Nachricht zu kurz.')

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('project_updates')
    .insert({ project_id: projectId, message: trimmed })
    .select('*')
    .single()

  if (error) throw new DomainError(error.message)
  return data
}
