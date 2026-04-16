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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export default async function ProjectPage() {
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

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, description, status, start_date, launch_date, created_at')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!project) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
        <p className="text-sm text-gray-400">Noch kein Projekt angelegt.</p>
      </div>
    )
  }

  const [
    { data: updates },
    { data: meetings },
    { data: messages },
    { data: changeRequests },
    { data: existingReview },
  ] = await Promise.all([
    supabase
      .from('project_updates')
      .select('id, message, created_at')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('meetings')
      .select('id, title, meeting_date, duration_minutes, notes, action_items')
      .eq('project_id', project.id)
      .order('meeting_date', { ascending: false }),
    supabase
      .from('messages')
      .select('id, sender_id, sender_role, content, read, created_at')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('change_requests')
      .select('id, title, description, status, admin_notes, created_at')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('reviews')
      .select('id, rating, text, status, created_at')
      .eq('project_id', project.id)
      .eq('client_id', user!.id)
      .maybeSingle(),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Mein Projekt</p>
        <h1 className="text-2xl font-semibold text-gray-900">{project.title}</h1>
        {project.description && (
          <p className="text-sm text-gray-500 mt-1 max-w-prose">{project.description}</p>
        )}
      </div>

      {/* Status card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Status</p>
            <span className="inline-flex items-center gap-1.5 font-medium text-gray-900">
              <span className="w-2 h-2 rounded-full bg-black" />
              {STATUS_LABELS[project.status as ProjectStatus]}
            </span>
          </div>
          {project.start_date && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Projektstart</p>
              <p className="font-medium text-gray-900">{formatDate(project.start_date)}</p>
            </div>
          )}
          {project.launch_date && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Geplanter Launch</p>
              <p className="font-medium text-gray-900">{formatDate(project.launch_date)}</p>
            </div>
          )}
        </div>
        <StatusTimeline status={project.status as ProjectStatus} />
      </div>

      {/* Tabs */}
      <ProjectTabs
        projectId={project.id}
        userId={user!.id}
        updates={updates ?? []}
        meetings={meetings ?? []}
        messages={messages ?? []}
        changeRequests={changeRequests ?? []}
        existingReview={existingReview ?? null}
      />
    </div>
  )
}
