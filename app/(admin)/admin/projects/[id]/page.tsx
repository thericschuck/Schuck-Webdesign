import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { ProjectStatus } from '@/types/database'
import { ProjectStatusControl } from './ProjectStatusControl'
import { AdminProjectTabs } from './AdminProjectTabs'
import { DeleteProjectButton } from './DeleteProjectButton'

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

const STATUS_ORDER: ProjectStatus[] = ['briefing', 'design', 'development', 'review', 'live']

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: project } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      description,
      status,
      start_date,
      launch_date,
      created_at,
      client:clients(id, company_name),
      documents(id, name, category, file_url, created_at)
    `)
    .eq('id', id)
    .single()

  if (!project) notFound()

  // Fetch all tab data in parallel
  const [
    { data: updates },
    { data: meetings },
    { data: changeRequests },
    { data: reviews },
  ] = await Promise.all([
    supabase
      .from('project_updates')
      .select('id, message, created_at')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('meetings')
      .select('id, title, meeting_date, duration_minutes, notes, action_items')
      .eq('project_id', id)
      .order('meeting_date', { ascending: false }),
    supabase
      .from('change_requests')
      .select('id, title, description, status, admin_notes, submitted_by, created_at')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('reviews')
      .select('id, client_id, rating, text, status, approved_at, published, created_at')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ])

  const client = Array.isArray(project.client) ? project.client[0] : project.client
  const documents = project.documents ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/projects" className="hover:text-gray-600 transition-colors">Projekte</Link>
        <span>/</span>
        <span className="text-gray-700">{project.title}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            {project.title}
          </h1>
          {client && (
            <Link
              href={`/admin/clients/${client.id}`}
              className="text-sm text-gray-500 hover:text-gray-700 mt-1 inline-block"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {client.company_name}
            </Link>
          )}
        </div>
        <span
          className={`text-sm px-3 py-1.5 rounded-full font-medium ${STATUS_COLOR[project.status]}`}
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {STATUS_LABEL[project.status]}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left sidebar */}
        <div className="col-span-1 flex flex-col gap-4">
          {/* Meta */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Projektdetails
            </h2>
            <dl className="flex flex-col gap-3">
              {project.description && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>Beschreibung</dt>
                  <dd className="text-sm text-gray-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>{project.description}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>Startdatum</dt>
                <dd className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {project.start_date
                    ? new Date(project.start_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>Launch-Datum</dt>
                <dd className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {project.launch_date
                    ? new Date(project.launch_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Status control */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Status ändern
            </h2>
            <ProjectStatusControl
              projectId={project.id}
              currentStatus={project.status}
              statusOrder={STATUS_ORDER}
              statusLabel={STATUS_LABEL}
            />
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Gefahrenbereich
            </h2>
            <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
          </div>

          {/* Documents */}
          {documents.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Dokumente ({documents.length})
              </h2>
              <div className="flex flex-col gap-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {doc.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Tabs */}
        <div className="col-span-2">
          <AdminProjectTabs
            projectId={project.id}
            adminId={user!.id}
            updates={updates ?? []}
            meetings={meetings ?? []}
            changeRequests={changeRequests ?? []}
            reviews={reviews ?? []}
          />
        </div>
      </div>
    </div>
  )
}
