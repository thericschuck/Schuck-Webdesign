import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatusTimeline } from '@/components/portal/StatusTimeline'
import type { ProjectStatus } from '@/types/database'

const STATUS_LABEL: Record<ProjectStatus, string> = {
  briefing:    'Briefing',
  design:      'Design',
  development: 'Entwicklung',
  review:      'Review',
  live:        'Live',
}

const STATUS_COLOR: Record<ProjectStatus, string> = {
  briefing:    'bg-gray-100 text-gray-500',
  design:      'bg-blue-50 text-blue-700',
  development: 'bg-amber-50 text-amber-700',
  review:      'bg-purple-50 text-purple-700',
  live:        'bg-green-50 text-green-700',
}

// Farbiger Top-Akzentstreifen pro Status
const STATUS_ACCENT: Record<ProjectStatus, string> = {
  briefing:    'bg-gray-300',
  design:      'bg-blue-400',
  development: 'bg-amber-400',
  review:      'bg-purple-400',
  live:        'bg-green-400',
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Heute'
  if (days === 1) return 'Gestern'
  if (days < 7) return `vor ${days} Tagen`
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

export default async function PortalDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name')
    .eq('profile_id', user!.id)
    .single()

  if (!client) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500 text-sm">Kein Kundeneintrag gefunden. Bitte kontaktiere uns.</p>
      </div>
    )
  }

  // Alle Projekte + ihre Updates
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id, title, description, status, start_date, launch_date, created_at,
      project_updates(id, message, created_at)
    `)
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  // Letzte 3 Dokumente
  const { data: documents } = await supabase
    .from('documents')
    .select('id, name, created_at')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <div className="space-y-8">

      {/* Welcome Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-950 px-7 py-8">
        {/* Dekorative Kreise */}
        <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 left-1/3 w-64 h-64 rounded-full bg-indigo-500/8 blur-3xl pointer-events-none" />

        <p className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2">
          Willkommen zurück
        </p>
        <h1 className="text-3xl font-semibold text-white tracking-tight">
          {client.company_name}
        </h1>
        <p className="text-sm text-white/50 mt-1.5">
          {(projects ?? []).length === 0
            ? 'Noch kein Projekt angelegt.'
            : (projects ?? []).length === 1
            ? '1 aktives Projekt'
            : `${(projects ?? []).length} aktive Projekte`}
        </p>
      </div>

      {/* Projekte */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          {(projects ?? []).length === 1 ? 'Dein Projekt' : 'Deine Projekte'}
        </h2>

        {(projects ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-400">Noch kein Projekt angelegt.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(projects ?? []).map((project) => {
              const sortedUpdates = [...(project.project_updates ?? [])].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )
              const lastUpdate = sortedUpdates[0] ?? null
              const status = project.status as ProjectStatus

              return (
                <Link
                  key={project.id}
                  href={`/portal/project?id=${project.id}`}
                  className="group relative block rounded-2xl border border-white/80 bg-white shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* Farbiger Akzentstreifen oben */}
                  <div className={`h-1 w-full ${STATUS_ACCENT[status]}`} />

                  <div className="p-5">
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <h3 className="text-base font-semibold text-gray-900 leading-snug">{project.title}</h3>
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[status]}`}>
                          {STATUS_LABEL[status]}
                        </span>
                      </div>
                    </div>

                    {project.description && (
                      <p className="text-xs text-gray-400 -mt-2 mb-4 truncate">{project.description}</p>
                    )}

                    {/* Status-Timeline */}
                    <StatusTimeline status={status} />

                    {/* Letztes Update */}
                    <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-start justify-between gap-4">
                      {lastUpdate ? (
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-600 leading-snug line-clamp-1">{lastUpdate.message}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatRelative(lastUpdate.created_at)}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-300 flex-1">Noch keine Updates</p>
                      )}
                      <svg
                        className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0 mt-0.5 transition-colors"
                        fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Letzte Dokumente */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dokumente</h2>
          <Link href="/portal/documents" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            Alle anzeigen →
          </Link>
        </div>

        <div className="rounded-xl border border-white/80 bg-white shadow-sm overflow-hidden">
          {documents && documents.length > 0 ? (
            <ul className="divide-y divide-gray-50">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
                  <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="text-sm text-gray-700 truncate flex-1">{doc.name}</p>
                  <span className="text-xs text-gray-400 shrink-0">{formatRelative(doc.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-400">Noch keine Dokumente.</p>
            </div>
          )}
          <div className="px-4 py-3 border-t border-gray-50">
            <Link href="/portal/upload" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
              Dateien hochladen →
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
