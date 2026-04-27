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
    return <p className="text-sm text-[#7C756B]">Kein Kundeneintrag gefunden.</p>
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
      <div className="rounded-[24px] border border-black/[0.06] bg-[#F1EEE7] p-10 text-center">
        <p className="text-sm text-[#7C756B]">Noch kein Projekt angelegt.</p>
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
    return <p className="text-sm text-[#7C756B]">Projekt nicht gefunden.</p>
  }

  const status = projectDetail.status as ProjectStatus

  return (
    <div className="space-y-8">

      {/* Projekt-Switcher — nur bei mehreren Projekten */}
      {projects.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/portal"
            className="inline-flex items-center gap-1.5 mr-1 text-xs text-[#8A847B] hover:text-[#1C1C1E] transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Alle Projekte
          </Link>

          <div className="h-4 w-px bg-black/[0.08]" />

          {projects.map((p) => {
            const isActive = p.id === selected.id
            return (
              <Link
                key={p.id}
                href={`/portal/project?id=${p.id}`}
                className={[
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors',
                  isActive
                    ? 'bg-[#1C1C1E] text-[#F5F5F0]'
                    : 'bg-[#ECE7DD] text-[#6B655D] hover:bg-[#E2DDD5]',
                ].join(' ')}
                style={{ fontFamily: 'var(--font-dm-sans)' }}
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
          <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[#7F77DD]" style={{ fontFamily: 'var(--font-dm-sans)' }}>Mein Projekt</p>
        )}
        <h1 className="text-3xl text-[#1C1C1E]" style={{ fontFamily: 'var(--font-fraunces)' }}>{projectDetail.title}</h1>
        {projectDetail.description && (
          <p className="mt-2 max-w-prose text-sm text-[#7A746B]" style={{ fontFamily: 'var(--font-dm-sans)' }}>{projectDetail.description}</p>
        )}
      </div>

      {/* Status-Karte */}
      <div className="rounded-[26px] border border-black/[0.06] bg-[#F7F5F0] p-6 space-y-5" style={{ boxShadow: '0 6px 24px rgba(0,0,0,0.06)' }}>
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="mb-0.5 text-xs text-[#9C968B]" style={{ fontFamily: 'var(--font-dm-sans)' }}>Status</p>
            <span className="inline-flex items-center gap-1.5 font-medium text-[#1C1C1E]" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
              {STATUS_LABELS[status]}
            </span>
          </div>
          {projectDetail.start_date && (
            <div>
              <p className="mb-0.5 text-xs text-[#9C968B]" style={{ fontFamily: 'var(--font-dm-sans)' }}>Projektstart</p>
              <p className="font-medium text-[#1C1C1E]" style={{ fontFamily: 'var(--font-dm-sans)' }}>{formatDate(projectDetail.start_date)}</p>
            </div>
          )}
          {projectDetail.launch_date && (
            <div>
              <p className="mb-0.5 text-xs text-[#9C968B]" style={{ fontFamily: 'var(--font-dm-sans)' }}>Geplanter Launch</p>
              <p className="font-medium text-[#1C1C1E]" style={{ fontFamily: 'var(--font-dm-sans)' }}>{formatDate(projectDetail.launch_date)}</p>
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
