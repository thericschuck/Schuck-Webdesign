import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatusTimeline } from '@/components/portal/StatusTimeline'
import { ProjectTabs } from './ProjectTabs'
import type { ProjectStatus } from '@/types/database'

const STATUS_LABELS: Record<ProjectStatus, string> = {
  briefing:    'Briefing',
  design:      'Design',
  development: 'Entwicklung',
  review:      'Review',
  live:        'Live',
}

const STATUS_DOT: Record<ProjectStatus, string> = {
  briefing:    'bg-gray-400',
  design:      'bg-blue-500',
  development: 'bg-amber-500',
  review:      'bg-purple-500',
  live:        'bg-green-500',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export default async function ProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id: requestedId } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name')
    .eq('profile_id', user!.id)
    .single()

  if (!client) {
    return <p className="text-sm text-gray-500">Kein Kundeneintrag gefunden.</p>
  }

  // Alle Projekte laden (für Switcher + Auswahl)
  const { data: allProjects } = await supabase
    .from('projects')
    .select('id, title, status')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  const projects = allProjects ?? []

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
        <p className="text-sm text-gray-400">Noch kein Projekt angelegt.</p>
      </div>
    )
  }

  // Angefordertes oder neuestes Projekt wählen
  const selected = projects.find((p) => p.id === requestedId) ?? projects[0]

  // Alle Daten für das ausgewählte Projekt laden
  const [
    { data: projectDetail },
    { data: updates },
    { data: meetings },
    { data: changeRequests },
    { data: existingReview },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, description, status, start_date, launch_date')
      .eq('id', selected.id)
      .single(),
    supabase
      .from('project_updates')
      .select('id, message, created_at')
      .eq('project_id', selected.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('meetings')
      .select('id, title, meeting_date, duration_minutes, notes, action_items')
      .eq('project_id', selected.id)
      .order('meeting_date', { ascending: false }),
    supabase
      .from('change_requests')
      .select('id, title, description, status, admin_notes, created_at')
      .eq('project_id', selected.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('reviews')
      .select('id, rating, text, status, created_at')
      .eq('project_id', selected.id)
      .eq('client_id', user!.id)
      .maybeSingle(),
  ])

  if (!projectDetail) {
    return <p className="text-sm text-gray-500">Projekt nicht gefunden.</p>
  }

  const status = projectDetail.status as ProjectStatus

  return (
    <div className="space-y-6">

      {/* Projekt-Switcher — nur bei mehreren Projekten */}
      {projects.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/portal"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors mr-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Alle Projekte
          </Link>

          <div className="h-4 w-px bg-gray-200" />

          {projects.map((p) => {
            const isActive = p.id === selected.id
            return (
              <Link
                key={p.id}
                href={`/portal/project?id=${p.id}`}
                className={[
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                ].join(' ')}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-white/60' : STATUS_DOT[p.status as ProjectStatus]}`} />
                <span className="truncate max-w-40">{p.title}</span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Header */}
      <div>
        {projects.length === 1 && (
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Mein Projekt</p>
        )}
        <h1 className="text-2xl font-semibold text-gray-900">{projectDetail.title}</h1>
        {projectDetail.description && (
          <p className="text-sm text-gray-500 mt-1 max-w-prose">{projectDetail.description}</p>
        )}
      </div>

      {/* Status-Karte */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Status</p>
            <span className="inline-flex items-center gap-1.5 font-medium text-gray-900">
              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
              {STATUS_LABELS[status]}
            </span>
          </div>
          {projectDetail.start_date && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Projektstart</p>
              <p className="font-medium text-gray-900">{formatDate(projectDetail.start_date)}</p>
            </div>
          )}
          {projectDetail.launch_date && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Geplanter Launch</p>
              <p className="font-medium text-gray-900">{formatDate(projectDetail.launch_date)}</p>
            </div>
          )}
        </div>
        <StatusTimeline status={status} />
      </div>

      {/* Tabs */}
      <ProjectTabs
        projectId={projectDetail.id}
        userId={user!.id}
        updates={updates ?? []}
        meetings={meetings ?? []}
        changeRequests={changeRequests ?? []}
        existingReview={existingReview ?? null}
      />
    </div>
  )
}
