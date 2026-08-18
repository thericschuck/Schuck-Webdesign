import { createAdminClient } from '@/lib/supabase/admin'
import { AddTodoGlobalForm } from './AddTodoGlobalForm'
import { TodosBoard } from './TodosBoard'
import type { RawTodo } from './types'

export default async function TodosPage() {
  const supabase = createAdminClient()

  const [{ data: rawTodos }, { data: projectList }] = await Promise.all([
    supabase
      .from('todos')
      .select(`
        id, title, done, priority, due_date, created_at, completed_at, project_id,
        projects(id, title, clients(company_name, contact_name, profiles(full_name)))
      `)
      .order('created_at', { ascending: true }),
    supabase
      .from('projects')
      .select('id, title')
      .order('title', { ascending: true }),
  ])

  const todos = (rawTodos ?? []) as RawTodo[]
  const projects = (projectList ?? []) as { id: string; title: string }[]

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

      {/* Board — Statistiken, Kategorie-Rail und Suche laufen komplett clientseitig,
          inkl. optimistischer Aktualisierung beim Abhaken/Löschen einer Aufgabe. */}
      {todos.length > 0 && <TodosBoard todos={todos} />}
    </div>
  )
}
