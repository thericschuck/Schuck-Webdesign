import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { toggleTodo, deleteTodo } from '@/app/(admin)/admin/projects/[id]/actions'
import { AddTodoGlobalForm } from './AddTodoGlobalForm'

const PRIORITY_LABEL = { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' } as const
const PRIORITY_COLOR = {
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-gray-100 text-gray-500',
} as const
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

type RawTodo = {
  id: string
  title: string
  done: boolean
  priority: 'high' | 'medium' | 'low'
  due_date: string | null
  created_at: string
  project_id: string | null
  projects: {
    id: string
    title: string
    clients: { company_name: string } | { company_name: string }[] | null
  } | null
}

type ProjectGroup = {
  id: string | null
  title: string
  company: string
  open: RawTodo[]
  done: RawTodo[]
}

// Reusable row components (server-renderable)
function OpenTodoRow({ todo, today }: { todo: RawTodo; today: Date }) {
  const isOverdue = todo.due_date && new Date(todo.due_date) < today
  return (
    <div className="px-5 py-3.5 flex items-start gap-3 group/row">
      <form action={toggleTodo} className="shrink-0 mt-0.5">
        <input type="hidden" name="todo_id" value={todo.id} />
        <input type="hidden" name="project_id" value={todo.project_id ?? ''} />
        <input type="hidden" name="done" value={String(todo.done)} />
        <button
          type="submit"
          title="Als erledigt markieren"
          className="w-4 h-4 rounded border-2 border-gray-300 hover:border-gray-900 hover:bg-gray-100 transition-colors flex items-center justify-center"
        />
      </form>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {todo.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span
            className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${PRIORITY_COLOR[todo.priority]}`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {PRIORITY_LABEL[todo.priority]}
          </span>
          {todo.due_date && (
            <span
              className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {isOverdue ? '⚠ Überfällig: ' : 'Fällig: '}{formatDate(todo.due_date)}
            </span>
          )}
        </div>
      </div>
      <form action={deleteTodo} className="shrink-0">
        <input type="hidden" name="todo_id" value={todo.id} />
        <input type="hidden" name="project_id" value={todo.project_id ?? ''} />
        <button
          type="submit"
          className="opacity-0 group-hover/row:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
          title="Aufgabe löschen"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </form>
    </div>
  )
}

function DoneTodoRow({ todo }: { todo: RawTodo }) {
  return (
    <div className="px-5 py-2.5 flex items-center gap-3 group/row">
      <form action={toggleTodo} className="shrink-0">
        <input type="hidden" name="todo_id" value={todo.id} />
        <input type="hidden" name="project_id" value={todo.project_id ?? ''} />
        <input type="hidden" name="done" value={String(todo.done)} />
        <button
          type="submit"
          title="Als offen markieren"
          className="w-4 h-4 rounded bg-gray-800 border-2 border-gray-800 flex items-center justify-center hover:bg-gray-600 hover:border-gray-600 transition-colors"
        >
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </form>
      <p className="flex-1 text-sm text-gray-400 line-through" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        {todo.title}
      </p>
      <form action={deleteTodo} className="shrink-0">
        <input type="hidden" name="todo_id" value={todo.id} />
        <input type="hidden" name="project_id" value={todo.project_id ?? ''} />
        <button
          type="submit"
          className="opacity-0 group-hover/row:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
          title="Aufgabe löschen"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </form>
    </div>
  )
}

function GroupCard({ group, today }: { group: ProjectGroup; today: Date }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-4">
        <div className="min-w-0">
          {group.id ? (
            <>
              <Link
                href={`/admin/projects/${group.id}`}
                className="text-sm font-semibold text-gray-900 hover:text-gray-500 transition-colors"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {group.title}
              </Link>
              {group.company && (
                <p className="text-xs text-gray-400 mt-0.5 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {group.company}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {group.title}
            </p>
          )}
        </div>
        <div className="shrink-0">
          {group.open.length > 0 ? (
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {group.open.length} offen
            </span>
          ) : (
            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Alle erledigt
            </span>
          )}
        </div>
      </div>

      {/* Open todos */}
      {group.open.length > 0 && (
        <div className="divide-y divide-gray-50">
          {group.open.map((todo) => (
            <OpenTodoRow key={todo.id} todo={todo} today={today} />
          ))}
        </div>
      )}

      {/* Done todos */}
      {group.done.length > 0 && (
        <>
          <div className={`px-5 py-2 bg-gray-50/60 border-gray-100 ${group.open.length > 0 ? 'border-t' : ''}`}>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Erledigt · {group.done.length}
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {group.done.map((todo) => (
              <DoneTodoRow key={todo.id} todo={todo} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default async function TodosPage() {
  const supabase = createAdminClient()

  const [{ data: rawTodos }, { data: projectList }] = await Promise.all([
    supabase
      .from('todos')
      .select(`
        id, title, done, priority, due_date, created_at, project_id,
        projects(id, title, clients(company_name))
      `)
      .order('created_at', { ascending: true }),
    supabase
      .from('projects')
      .select('id, title')
      .order('title', { ascending: true }),
  ])

  const todos = (rawTodos ?? []) as RawTodo[]
  const projects = (projectList ?? []) as { id: string; title: string }[]

  // Separate general todos (no project) from project todos
  const generalTodos = todos.filter((t) => !t.project_id)
  const projectTodos = todos.filter((t) => t.project_id)

  // Group project todos by project
  const projectMap = new Map<string, ProjectGroup>()
  for (const todo of projectTodos) {
    if (!todo.projects) continue
    if (!projectMap.has(todo.project_id!)) {
      const c = todo.projects.clients
      const company = Array.isArray(c) ? (c[0]?.company_name ?? '') : (c?.company_name ?? '')
      projectMap.set(todo.project_id!, {
        id: todo.projects.id,
        title: todo.projects.title,
        company,
        open: [],
        done: [],
      })
    }
    const group = projectMap.get(todo.project_id!)!
    if (todo.done) group.done.push(todo)
    else group.open.push(todo)
  }

  for (const group of projectMap.values()) {
    group.open.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
  }

  const projectGroups = Array.from(projectMap.values()).sort((a, b) => b.open.length - a.open.length)

  // General group
  const generalGroup: ProjectGroup = {
    id: null,
    title: 'Allgemein',
    company: '',
    open: generalTodos
      .filter((t) => !t.done)
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
    done: generalTodos.filter((t) => t.done),
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const totalOpen = todos.filter((t) => !t.done).length
  const totalDone = todos.filter((t) => t.done).length
  const overdueCount = todos.filter(
    (t) => !t.done && t.due_date && new Date(t.due_date) < today
  ).length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            To-Dos
          </h1>
          <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Alle Aufgaben über alle Projekte hinweg
          </p>
        </div>
        <AddTodoGlobalForm projects={projects} />
      </div>

      {/* Stats */}
      {todos.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-gray-900 shrink-0" />
            <span className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {totalOpen} offen
            </span>
          </div>
          {overdueCount > 0 && (
            <div className="bg-white rounded-xl border border-red-100 shadow-sm px-4 py-3 flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span className="text-sm font-medium text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {overdueCount} überfällig
              </span>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <span className="text-sm font-medium text-gray-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {totalDone} erledigt
            </span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {todos.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-16 text-center">
          <p className="text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Noch keine Aufgaben vorhanden.
          </p>
          <p className="text-gray-400 text-xs mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Klicke oben auf „Aufgabe hinzufügen" um loszulegen.
          </p>
        </div>
      )}

      {/* Grouped list */}
      {todos.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* General todos first (if any) */}
          {(generalGroup.open.length > 0 || generalGroup.done.length > 0) && (
            <GroupCard group={generalGroup} today={today} />
          )}

          {/* Project todos */}
          {projectGroups.map((group) => (
            <GroupCard key={group.id} group={group} today={today} />
          ))}
        </div>
      )}
    </div>
  )
}
