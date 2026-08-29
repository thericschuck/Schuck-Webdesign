import { createAdminClient } from '@/lib/supabase/admin'
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          To-Dos
        </h1>
        <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Alle Aufgaben über alle Projekte hinweg
        </p>
      </div>

      {/* Board — Statistiken, "Aufgabe hinzufügen", Kategorie-Rail und Suche laufen komplett
          clientseitig, inkl. optimistischer Aktualisierung beim Abhaken/Löschen einer Aufgabe. */}
      <TodosBoard todos={todos} projects={projects} />
    </div>
  )
}
