import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { ProjectStatus } from '@/types/database'
import { clientDisplayName } from '@/lib/client-name'

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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Projekte
          </h1>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {projects?.length ?? 0} Projekte{status ? ` (${STATUS_LABEL[status as ProjectStatus]})` : ''}
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
        {projects && projects.length > 0 ? (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {projects.map((project) => {
                const client = Array.isArray(project.client) ? project.client[0] : project.client
                const clientProfile = client ? (Array.isArray(client.profiles) ? client.profiles[0] : client.profiles) : null
                const clientName = client ? clientDisplayName(clientProfile?.full_name, client.contact_name, client.company_name) : null
                const unread = unreadByProject.get(project.id) ?? 0
                return (
                  <Link
                    key={project.id}
                    href={`/admin/projects/${project.id}`}
                    className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {project.project_number && (
                          <span className="text-xs text-gray-400 font-mono shrink-0" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                            {project.project_number}
                          </span>
                        )}
                        <p className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {project.title}
                        </p>
                        {unread > 0 && (
                          <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none font-medium shrink-0">
                            {unread}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {clientName ?? '—'}{project.launch_date ? ` · Launch: ${new Date(project.launch_date).toLocaleDateString('de-DE')}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[project.status]}`} style={{ fontFamily: 'var(--font-dm-sans)' }}>
                        {STATUS_LABEL[project.status]}
                      </span>
                      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Desktop table */}
            <table className="hidden md:table w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Nr.</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Projekt</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Kunde</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>Launch</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projects.map((project) => {
                  const client = Array.isArray(project.client) ? project.client[0] : project.client
                  const clientProfile = client ? (Array.isArray(client.profiles) ? client.profiles[0] : client.profiles) : null
                  const clientName = client ? clientDisplayName(clientProfile?.full_name, client.contact_name, client.company_name) : null
                  return (
                    <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-400 font-mono" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {project.project_number ?? '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>{project.title}</p>
                          {(unreadByProject.get(project.id) ?? 0) > 0 && (
                            <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none font-medium">
                              {unreadByProject.get(project.id)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {project.start_date ? `Start: ${new Date(project.start_date).toLocaleDateString('de-DE')}` : 'Kein Startdatum'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {client ? (
                          <Link href={`/admin/clients/${client.id}`} className="text-sm text-gray-700 hover:text-gray-900 hover:underline" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                            {clientName}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[project.status]}`} style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {STATUS_LABEL[project.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {project.launch_date ? new Date(project.launch_date).toLocaleDateString('de-DE') : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/admin/projects/${project.id}`} className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          Details →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
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
