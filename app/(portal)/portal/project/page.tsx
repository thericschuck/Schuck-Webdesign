import { createClient } from '@/lib/supabase/server'
import { StatusTimeline } from '@/components/portal/StatusTimeline'
import { ProjectTabs } from './ProjectTabs'
import { ProjectSwitcher } from './ProjectSwitcher'
import { STATUS_DOT, STATUS_LABELS } from './status-constants'
import type { ProjectStatus } from '@/types/database'

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
      {projects.length > 1 && <ProjectSwitcher projects={projects} selectedId={selected.id} />}

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
