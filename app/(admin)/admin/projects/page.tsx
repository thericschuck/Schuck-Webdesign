import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { ProjectStatus } from '@/types/database'
import { clientDisplayName } from '@/lib/client-name'
import { ProjectsTable, type ProjectRow } from './ProjectsTable'

const STATUS_LABEL: Record<ProjectStatus, string> = {
  briefing: 'Briefing',
  design: 'Design',
  development: 'Entwicklung',
  review: 'Review',
  live: 'Live',
}

const STATUS_COLOR: Record<ProjectStatus, string> = {
  briefing: 'bg-gray-100 text-gray-600',
  design: 'bg-blue-50 text-blue-700',
  development: 'bg-amber-50 text-amber-700',
  review: 'bg-purple-50 text-purple-700',
  live: 'bg-green-50 text-green-700',
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select(`
      id,
      project_number,
      title,
      status,
      start_date,
      launch_date,
      created_at,
      client:clients(id, company_name, contact_name, profiles(full_name))
    `)
    .order('created_at', { ascending: false })

  if (status && Object.keys(STATUS_LABEL).includes(status)) {
    query = query.eq('status', status as ProjectStatus)
  }

  const [{ data: projects }, { data: unreadMsgs }] = await Promise.all([
    query,
    supabase
      .from('messages')
      .select('project_id')
      .eq('sender_role', 'client')
      .eq('read', false),
  ])

  const unreadByProject = new Map<string, number>()
  unreadMsgs?.forEach((m) => {
    unreadByProject.set(m.project_id, (unreadByProject.get(m.project_id) ?? 0) + 1)
  })

  const rows: ProjectRow[] = (projects ?? []).map((project) => {
    const client = Array.isArray(project.client) ? project.client[0] : project.client
    const clientProfile = client ? (Array.isArray(client.profiles) ? client.profiles[0] : client.profiles) : null
    const clientName = client ? clientDisplayName(clientProfile?.full_name, client.contact_name, client.company_name) : null
    return {
      id: project.id,
      number: project.project_number,
      title: project.title,
      status: project.status,
      startDate: project.start_date,
      launchDate: project.launch_date,
      clientId: client?.id ?? null,
      clientName,
      unreadCount: unreadByProject.get(project.id) ?? 0,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Projekte
          </h1>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {rows.length} Projekte{status ? ` (${STATUS_LABEL[status as ProjectStatus]})` : ''}
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Neues Projekt
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/projects"
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            !status ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Alle
        </Link>
        {(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => (
          <Link
            key={s}
            href={`/admin/projects?status=${s}`}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              status === s ? 'bg-gray-900 text-white' : STATUS_COLOR[s] + ' hover:opacity-80'
            }`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {/* List / Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {rows.length > 0 ? (
          <ProjectsTable rows={rows} />
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="text-gray-400 text-sm mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>Keine Projekte gefunden.</p>
            <Link href="/admin/projects/new" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:underline" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Erstes Projekt anlegen →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
