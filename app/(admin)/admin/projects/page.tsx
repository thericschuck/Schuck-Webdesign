import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { clientDisplayName, clientDisplaySubtitle } from '@/lib/client-name'
import type { ProjectStatus } from '@/types/database'
import { ProjectsBoard } from './ProjectsBoard'
import type { ProjectRow } from './types'

const VALID_STATUSES: ProjectStatus[] = ['briefing', 'design', 'development', 'review', 'live']

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const initialStatus = VALID_STATUSES.includes(status as ProjectStatus) ? (status as ProjectStatus) : null
  const supabase = await createClient()

  // Alles auf einmal laden — Statusfilter, Suche und Sortierung laufen clientseitig
  // im Board, kein Server-Roundtrip pro Filterklick nötig.
  const [{ data: projects }, { data: unreadMsgs }, { data: openTodos }] = await Promise.all([
    supabase
      .from('projects')
      .select(`
        id,
        project_number,
        title,
        status,
        start_date,
        launch_date,
        live_url,
        created_at,
        client:clients(id, company_name, contact_name, profiles(full_name))
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('messages')
      .select('project_id')
      .eq('sender_role', 'client')
      .eq('read', false),
    supabase
      .from('todos')
      .select('project_id, due_date')
      .eq('done', false)
      .not('project_id', 'is', null),
  ])

  const unreadByProject = new Map<string, number>()
  unreadMsgs?.forEach((m) => {
    unreadByProject.set(m.project_id, (unreadByProject.get(m.project_id) ?? 0) + 1)
  })

  // Offene Aufgaben je Projekt — die Karte zeigt damit, wo tatsächlich Arbeit liegt,
  // und markiert überfällige Fälligkeiten rot.
  const todayIso = new Date().toISOString().slice(0, 10)
  const todosByProject = new Map<string, { open: number; overdue: number }>()
  openTodos?.forEach((t) => {
    if (!t.project_id) return
    const entry = todosByProject.get(t.project_id) ?? { open: 0, overdue: 0 }
    entry.open += 1
    if (t.due_date && t.due_date < todayIso) entry.overdue += 1
    todosByProject.set(t.project_id, entry)
  })

  const rows: ProjectRow[] = (projects ?? []).map((project) => {
    const client = Array.isArray(project.client) ? project.client[0] : project.client
    const clientProfile = client ? (Array.isArray(client.profiles) ? client.profiles[0] : client.profiles) : null
    const todos = todosByProject.get(project.id)
    return {
      id: project.id,
      number: project.project_number,
      title: project.title,
      status: project.status,
      startDate: project.start_date,
      launchDate: project.launch_date,
      liveUrl: project.live_url,
      clientId: client?.id ?? null,
      clientName: client ? clientDisplayName(clientProfile?.full_name, client.contact_name, client.company_name) : null,
      clientCompany: client ? clientDisplaySubtitle(clientProfile?.full_name, client.contact_name, client.company_name) : null,
      unreadCount: unreadByProject.get(project.id) ?? 0,
      openTodos: todos?.open ?? 0,
      overdueTodos: todos?.overdue ?? 0,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Projekte
          </h1>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Alle Projekte entlang der fünf Phasen von Briefing bis Live
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors shrink-0"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Neues Projekt
        </Link>
      </div>

      <ProjectsBoard rows={rows} initialStatus={initialStatus} />
    </div>
  )
}
