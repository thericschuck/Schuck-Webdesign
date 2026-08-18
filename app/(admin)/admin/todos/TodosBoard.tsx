'use client'

import { useMemo, useState, useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import { toggleTodo, deleteTodo } from '@/app/(admin)/admin/projects/[id]/actions'
import { clientDisplayName } from '@/lib/client-name'
import type { ProjectGroup, RawTodo } from './types'

const PRIORITY_LABEL = { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' } as const
const PRIORITY_COLOR = {
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-gray-100 text-gray-500',
} as const
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const

const ALL_KEY = '__all__'

type TodoOptimisticAction = { type: 'toggle'; id: string } | { type: 'delete'; id: string }

function applyTodoOptimisticAction(state: RawTodo[], action: TodoOptimisticAction): RawTodo[] {
  if (action.type === 'toggle') {
    return state.map((t) =>
      t.id === action.id ? { ...t, done: !t.done, completed_at: !t.done ? new Date().toISOString() : null } : t
    )
  }
  return state.filter((t) => t.id !== action.id)
}

function sortDoneNewestFirst(todos: RawTodo[]): RawTodo[] {
  return [...todos].sort(
    (a, b) => new Date(b.completed_at ?? b.created_at).getTime() - new Date(a.completed_at ?? a.created_at).getTime()
  )
}

function groupKey(group: ProjectGroup): string {
  return group.id ?? '__general__'
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Rows ─────────────────────────────────────────────────────────────────────

function OpenTodoRow({
  todo,
  today,
  contextLabel,
  onToggle,
  onDelete,
}: {
  todo: RawTodo
  today: Date
  contextLabel?: string
  onToggle: (todo: RawTodo) => void
  onDelete: (todo: RawTodo) => void
}) {
  const isOverdue = todo.due_date != null && new Date(todo.due_date) < today
  return (
    <div className="px-5 py-3.5 flex items-start gap-3 group/row">
      <button
        onClick={() => onToggle(todo)}
        title="Als erledigt markieren"
        className="shrink-0 mt-0.5 w-4 h-4 rounded border-2 border-gray-300 hover:border-gray-900 hover:bg-gray-100 transition-colors flex items-center justify-center"
      />
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
      {contextLabel && (
        <span
          className="shrink-0 mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 max-w-32 truncate"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
          title={contextLabel}
        >
          {contextLabel}
        </span>
      )}
      <button
        onClick={() => onDelete(todo)}
        className="shrink-0 opacity-0 group-hover/row:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
        title="Aufgabe löschen"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}

function DoneTodoRow({
  todo,
  contextLabel,
  onToggle,
  onDelete,
}: {
  todo: RawTodo
  contextLabel?: string
  onToggle: (todo: RawTodo) => void
  onDelete: (todo: RawTodo) => void
}) {
  return (
    <div className="px-5 py-2.5 flex items-center gap-3 group/row">
      <button
        onClick={() => onToggle(todo)}
        title="Als offen markieren"
        className="shrink-0 w-4 h-4 rounded bg-gray-800 border-2 border-gray-800 flex items-center justify-center hover:bg-gray-600 hover:border-gray-600 transition-colors"
      >
        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <p className="flex-1 min-w-0 text-sm text-gray-400 line-through truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        {todo.title}
      </p>
      <span className="shrink-0 text-xs text-gray-300" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        {formatDate(todo.completed_at ?? todo.created_at)}
      </span>
      {contextLabel && (
        <span
          className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-400 max-w-32 truncate"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
          title={contextLabel}
        >
          {contextLabel}
        </span>
      )}
      <button
        onClick={() => onDelete(todo)}
        className="shrink-0 opacity-0 group-hover/row:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
        title="Aufgabe löschen"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}

// ── Group card (open list + collapsible "erledigt" section) ────────────────

function GroupCard({
  group,
  today,
  onToggle,
  onDelete,
}: {
  group: ProjectGroup
  today: Date
  onToggle: (todo: RawTodo) => void
  onDelete: (todo: RawTodo) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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

      {group.open.length > 0 ? (
        <div className="max-h-105 overflow-auto custom-scrollbar divide-y divide-gray-100">
          {group.open.map((todo) => (
            <OpenTodoRow key={todo.id} todo={todo} today={today} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </div>
      ) : group.done.length > 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Keine offenen Aufgaben
          </p>
        </div>
      ) : null}

      {/* Done todos — collapsed by default so a long history never pushes other categories down */}
      {group.done.length > 0 && (
        <details className={`group ${group.open.length > 0 ? 'border-t border-gray-100' : ''}`}>
          <summary
            className="px-5 py-2 bg-gray-50/60 text-xs font-medium text-gray-400 uppercase tracking-wide cursor-pointer select-none hover:text-gray-600 transition-colors list-none flex items-center gap-1.5"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            <svg className="w-3 h-3 shrink-0 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Erledigt · {group.done.length}
          </summary>
          <div className="max-h-105 overflow-auto custom-scrollbar divide-y divide-gray-100">
            {group.done.map((todo) => (
              <DoneTodoRow key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

// ── Category rail ────────────────────────────────────────────────────────────

function RailItem({
  active,
  onClick,
  title,
  subtitle,
  openCount,
  overdue,
}: {
  active: boolean
  onClick: () => void
  title: string
  subtitle?: string
  openCount: number
  overdue: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 rounded-xl border transition-colors flex items-center gap-2.5 ${
        active
          ? 'bg-gray-900 border-gray-900 text-white'
          : 'bg-white border-gray-100 text-gray-700 hover:border-gray-300'
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          {overdue && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-red-300' : 'bg-red-500'}`} />}
          <span
            className={`text-sm font-medium truncate block ${active ? 'text-white' : 'text-gray-800'}`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {title}
          </span>
        </span>
        {subtitle && (
          <span
            className={`text-[11px] truncate block mt-0.5 ${active ? 'text-white/60' : 'text-gray-400'}`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {subtitle}
          </span>
        )}
      </span>
      <span
        className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full ${
          openCount > 0
            ? active
              ? 'bg-white/15 text-white'
              : 'bg-gray-100 text-gray-600'
            : active
              ? 'bg-white/15 text-white/70'
              : 'bg-green-50 text-green-700'
        }`}
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        {openCount > 0 ? openCount : '✓'}
      </span>
    </button>
  )
}

// ── Board ─────────────────────────────────────────────────────────────────────

export function TodosBoard({ todos }: { todos: RawTodo[] }) {
  // Todos werden optimistisch aktualisiert — Checkbox/Löschen reagieren sofort,
  // ohne auf die Server-Antwort zu warten; useOptimistic verwirft den lokalen
  // Override automatisch, sobald die revalidierten `todos` aus dem Server-Component ankommen.
  const [optimisticTodos, applyTodoOptimistic] = useOptimistic(todos, applyTodoOptimisticAction)
  const [, startTodoTransition] = useTransition()

  function handleToggle(todo: RawTodo) {
    startTodoTransition(async () => {
      applyTodoOptimistic({ type: 'toggle', id: todo.id })
      const fd = new FormData()
      fd.set('todo_id', todo.id)
      fd.set('project_id', todo.project_id ?? '')
      fd.set('done', String(todo.done))
      await toggleTodo(fd)
    })
  }

  function handleDelete(todo: RawTodo) {
    startTodoTransition(async () => {
      applyTodoOptimistic({ type: 'delete', id: todo.id })
      const fd = new FormData()
      fd.set('todo_id', todo.id)
      fd.set('project_id', todo.project_id ?? '')
      await deleteTodo(fd)
    })
  }

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const { generalGroup, projectGroups, totalOpen, totalDone, overdueCount } = useMemo(() => {
    const generalTodos = optimisticTodos.filter((t) => !t.project_id)
    const projectTodos = optimisticTodos.filter((t) => t.project_id)

    const projectMap = new Map<string, ProjectGroup>()
    for (const todo of projectTodos) {
      if (!todo.projects) continue
      if (!projectMap.has(todo.project_id!)) {
        const c = Array.isArray(todo.projects.clients) ? todo.projects.clients[0] : todo.projects.clients
        const cProfile = c ? (Array.isArray(c.profiles) ? c.profiles[0] : c.profiles) : null
        const company = c ? clientDisplayName(cProfile?.full_name, c.contact_name, c.company_name) : ''
        projectMap.set(todo.project_id!, { id: todo.projects.id, title: todo.projects.title, company, open: [], done: [] })
      }
      const group = projectMap.get(todo.project_id!)!
      if (todo.done) group.done.push(todo)
      else group.open.push(todo)
    }
    for (const group of projectMap.values()) {
      group.open.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
      group.done = sortDoneNewestFirst(group.done)
    }
    const projectGroups = Array.from(projectMap.values()).sort((a, b) => b.open.length - a.open.length)

    const generalGroup: ProjectGroup = {
      id: null,
      title: 'Allgemein',
      company: '',
      open: generalTodos.filter((t) => !t.done).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
      done: sortDoneNewestFirst(generalTodos.filter((t) => t.done)),
    }

    return {
      generalGroup,
      projectGroups,
      totalOpen: optimisticTodos.filter((t) => !t.done).length,
      totalDone: optimisticTodos.filter((t) => t.done).length,
      overdueCount: optimisticTodos.filter((t) => !t.done && t.due_date && new Date(t.due_date) < today).length,
    }
  }, [optimisticTodos, today])

  const allGroups = useMemo(
    () => [...(generalGroup.open.length > 0 || generalGroup.done.length > 0 ? [generalGroup] : []), ...projectGroups],
    [generalGroup, projectGroups]
  )
  const [activeKey, setActiveKey] = useState<string>(ALL_KEY)
  const [query, setQuery] = useState('')

  const searching = query.trim().length > 0
  const searchResults = useMemo(() => {
    if (!searching) return { open: [] as { todo: RawTodo; label: string }[], done: [] as { todo: RawTodo; label: string }[] }
    const q = query.trim().toLowerCase()
    const open: { todo: RawTodo; label: string }[] = []
    const done: { todo: RawTodo; label: string }[] = []
    for (const g of allGroups) {
      for (const t of g.open) if (t.title.toLowerCase().includes(q)) open.push({ todo: t, label: g.title })
      for (const t of g.done) if (t.title.toLowerCase().includes(q)) done.push({ todo: t, label: g.title })
    }
    done.sort((a, b) => new Date(b.todo.completed_at ?? b.todo.created_at).getTime() - new Date(a.todo.completed_at ?? a.todo.created_at).getTime())
    return { open, done }
  }, [searching, query, allGroups])

  const activeGroup = allGroups.find((g) => groupKey(g) === activeKey) ?? null

  // Flat cross-category view for "Alle Kategorien" — one simple list, category shown as a tag per row
  const flatAll = useMemo(() => {
    const open: { todo: RawTodo; label: string }[] = []
    const done: { todo: RawTodo; label: string }[] = []
    for (const g of allGroups) {
      for (const t of g.open) open.push({ todo: t, label: g.title })
      for (const t of g.done) done.push({ todo: t, label: g.title })
    }
    open.sort((a, b) => PRIORITY_ORDER[a.todo.priority] - PRIORITY_ORDER[b.todo.priority])
    done.sort((a, b) => new Date(b.todo.completed_at ?? b.todo.created_at).getTime() - new Date(a.todo.completed_at ?? a.todo.created_at).getTime())
    return { open, done }
  }, [allGroups])

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
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

      {/* Search — finds a task no matter which category it lives in, without any scrolling */}
      <div className="relative">
        <svg className="w-4 h-4 text-gray-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="text"
          placeholder="Aufgabe über alle Projekte hinweg suchen…"
          className="w-full rounded-xl border border-gray-100 bg-white shadow-sm pl-10 pr-4 py-2.5 text-sm outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        />
      </div>

      {searching ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {searchResults.open.length === 0 && searchResults.done.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Keine Aufgabe gefunden für „{query}".
            </p>
          ) : (
            <>
              {searchResults.open.length > 0 && (
                <div className="max-h-105 overflow-auto custom-scrollbar divide-y divide-gray-100">
                  {searchResults.open.map(({ todo, label }) => (
                    <OpenTodoRow key={todo.id} todo={todo} today={today} contextLabel={label} onToggle={handleToggle} onDelete={handleDelete} />
                  ))}
                </div>
              )}
              {searchResults.done.length > 0 && (
                <div className={`max-h-105 overflow-auto custom-scrollbar divide-y divide-gray-100 ${searchResults.open.length > 0 ? 'border-t border-gray-100' : ''}`}>
                  {searchResults.done.map(({ todo, label }) => (
                    <DoneTodoRow key={todo.id} todo={todo} contextLabel={label} onToggle={handleToggle} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Category rail — jump straight to a project's tasks, no scrolling past the others */}
          <nav
            className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible custom-scrollbar pb-1 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0 lg:w-64 lg:shrink-0 lg:sticky lg:top-8"
            aria-label="Kategorien"
          >
            <RailItem
              active={activeKey === ALL_KEY}
              onClick={() => setActiveKey(ALL_KEY)}
              title="Alle Kategorien"
              openCount={allGroups.reduce((sum, g) => sum + g.open.length, 0)}
              overdue={allGroups.some((g) => g.open.some((t) => t.due_date && new Date(t.due_date) < today))}
            />
            {allGroups.map((g) => (
              <RailItem
                key={groupKey(g)}
                active={activeKey === groupKey(g)}
                onClick={() => setActiveKey(groupKey(g))}
                title={g.title}
                subtitle={g.company || undefined}
                openCount={g.open.length}
                overdue={g.open.some((t) => t.due_date && new Date(t.due_date) < today)}
              />
            ))}
          </nav>

          {/* Detail pane */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {activeKey === ALL_KEY ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {flatAll.open.length > 0 ? (
                  <div className="max-h-105 overflow-auto custom-scrollbar divide-y divide-gray-100">
                    {flatAll.open.map(({ todo, label }) => (
                      <OpenTodoRow key={todo.id} todo={todo} today={today} contextLabel={label} onToggle={handleToggle} onDelete={handleDelete} />
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-10 text-center">
                    <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      Keine offenen Aufgaben
                    </p>
                  </div>
                )}

                {/* Done todos — collapsed by default so history never pushes other categories down */}
                {flatAll.done.length > 0 && (
                  <details className={`group ${flatAll.open.length > 0 ? 'border-t border-gray-100' : ''}`}>
                    <summary
                      className="px-5 py-2 bg-gray-50/60 text-xs font-medium text-gray-400 uppercase tracking-wide cursor-pointer select-none hover:text-gray-600 transition-colors list-none flex items-center gap-1.5"
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                    >
                      <svg className="w-3 h-3 shrink-0 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      Erledigt · {flatAll.done.length}
                    </summary>
                    <div className="max-h-105 overflow-auto custom-scrollbar divide-y divide-gray-100">
                      {flatAll.done.map(({ todo, label }) => (
                        <DoneTodoRow key={todo.id} todo={todo} contextLabel={label} onToggle={handleToggle} onDelete={handleDelete} />
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ) : (
              activeGroup && <GroupCard group={activeGroup} today={today} onToggle={handleToggle} onDelete={handleDelete} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
