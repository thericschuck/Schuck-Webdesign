import { createAdminClient } from '@/lib/supabase/admin'
import { DomainError } from './errors'

export type TodoPriority = 'high' | 'medium' | 'low'

export interface Todo {
  id: string
  title: string
  done: boolean
  priority: TodoPriority
  due_date: string | null
  project_id: string | null
  project_title: string | null
  created_at: string
}

interface RawTodoRow {
  id: string
  title: string
  done: boolean
  priority: TodoPriority
  due_date: string | null
  project_id: string | null
  created_at: string
  projects: { title: string } | { title: string }[] | null
}

function toTodo(row: RawTodoRow): Todo {
  const project = Array.isArray(row.projects) ? row.projects[0] : row.projects
  return {
    id: row.id,
    title: row.title,
    done: row.done,
    priority: row.priority,
    due_date: row.due_date,
    project_id: row.project_id,
    project_title: project?.title ?? null,
    created_at: row.created_at,
  }
}

const TODO_SELECT = 'id, title, done, priority, due_date, project_id, created_at, projects(title)'

// ── listTodos ───────────────────────────────────────────────────────────────

export async function listTodos(filter?: { done?: boolean; projectId?: string }): Promise<Todo[]> {
  const adminClient = createAdminClient()
  let query = adminClient.from('todos').select(TODO_SELECT).order('due_date', { ascending: true, nullsFirst: false })

  if (filter?.done !== undefined) query = query.eq('done', filter.done)
  if (filter?.projectId) query = query.eq('project_id', filter.projectId)

  const { data, error } = await query
  if (error) throw new DomainError(error.message)
  return (data as unknown as RawTodoRow[]).map(toTodo)
}

// ── createTodo ──────────────────────────────────────────────────────────────

export interface CreateTodoInput {
  title: string
  priority?: TodoPriority
  dueDate?: string | null
  projectId?: string | null
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('todos')
    .insert({
      title: input.title,
      priority: input.priority ?? 'medium',
      due_date: input.dueDate ?? null,
      project_id: input.projectId ?? null,
    })
    .select(TODO_SELECT)
    .single()

  if (error) throw new DomainError(error.message)
  return toTodo(data as unknown as RawTodoRow)
}

// ── updateTodo ──────────────────────────────────────────────────────────────

export interface UpdateTodoInput {
  title?: string
  priority?: TodoPriority
  dueDate?: string | null
  done?: boolean
}

export async function updateTodo(id: string, input: UpdateTodoInput): Promise<Todo> {
  const adminClient = createAdminClient()

  const patch: { title?: string; priority?: TodoPriority; due_date?: string | null; done?: boolean; completed_at?: string | null } = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.priority !== undefined) patch.priority = input.priority
  if (input.dueDate !== undefined) patch.due_date = input.dueDate
  if (input.done !== undefined) {
    patch.done = input.done
    patch.completed_at = input.done ? new Date().toISOString() : null
  }

  const { data, error } = await adminClient.from('todos').update(patch).eq('id', id).select(TODO_SELECT).single()

  if (error) throw new DomainError(error.message)
  if (!data) throw new DomainError('Todo nicht gefunden.')
  return toTodo(data as unknown as RawTodoRow)
}

// ── deleteTodo ──────────────────────────────────────────────────────────────

export async function deleteTodo(id: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('todos').delete().eq('id', id)
  if (error) throw new DomainError(error.message)
}
