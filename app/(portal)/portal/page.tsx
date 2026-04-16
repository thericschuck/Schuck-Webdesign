import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatusTimeline } from '@/components/portal/StatusTimeline'
import type { ProjectStatus } from '@/types/database'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Heute'
  if (days === 1) return 'Gestern'
  if (days < 7)  return `vor ${days} Tagen`
  return formatDate(iso)
}

const CATEGORY_LABELS: Record<string, string> = {
  contract: 'Vertrag',
  invoice: 'Rechnung',
  briefing: 'Briefing',
  handover: 'Übergabe',
  other: 'Sonstiges',
}

export default async function PortalDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Client-Datensatz des eingeloggten Users
  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name')
    .eq('profile_id', user!.id)
    .single()

  if (!client) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500 text-sm">
          Kein Kundeneintrag gefunden. Bitte kontaktiere uns.
        </p>
      </div>
    )
  }

  // Neuestes Projekt
  const { data: project } = await supabase
    .from('projects')
    .select('id, title, status, start_date, launch_date')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Letzte 4 Updates
  const { data: updates } = project
    ? await supabase
        .from('project_updates')
        .select('id, message, created_at')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(4)
    : { data: [] }

  // Letzte 3 Dokumente
  const { data: documents } = await supabase
    .from('documents')
    .select('id, name, category, created_at')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <div className="space-y-6">
      {/* Willkommens-Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {client.company_name}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Willkommen in deinem Projektportal</p>
      </div>

      {/* Projekt Status */}
      {project ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                Aktuelles Projekt
              </p>
              <h2 className="text-lg font-semibold text-gray-900">{project.title}</h2>
            </div>
            <Link
              href="/portal/project"
              className="text-xs text-gray-500 hover:text-gray-900 whitespace-nowrap flex-shrink-0 underline underline-offset-2"
            >
              Details →
            </Link>
          </div>

          <StatusTimeline status={project.status as ProjectStatus} />

          {(project.start_date || project.launch_date) && (
            <div className="flex gap-6 pt-1">
              {project.start_date && (
                <div>
                  <p className="text-xs text-gray-400">Projektstart</p>
                  <p className="text-sm font-medium text-gray-700">{formatDate(project.start_date)}</p>
                </div>
              )}
              {project.launch_date && (
                <div>
                  <p className="text-xs text-gray-400">Geplanter Launch</p>
                  <p className="text-sm font-medium text-gray-700">{formatDate(project.launch_date)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-400">Noch kein Projekt angelegt.</p>
        </div>
      )}

      {/* Letzte Updates + Dokumente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Updates */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Letzte Updates</h3>
          </div>
          {updates && updates.length > 0 ? (
            <ul className="space-y-3">
              {updates.map((u) => (
                <li key={u.id} className="flex gap-3 items-start">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-black flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 leading-snug">{u.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatRelative(u.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Noch keine Updates.</p>
          )}
          {project && (
            <Link
              href="/portal/project"
              className="mt-4 block text-xs text-gray-400 hover:text-gray-700"
            >
              Alle Updates →
            </Link>
          )}
        </div>

        {/* Dokumente */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Dokumente</h3>
            <Link
              href="/portal/documents"
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              Alle anzeigen →
            </Link>
          </div>
          {documents && documents.length > 0 ? (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-2">
                  <span className="text-gray-300">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 truncate">{doc.name}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {CATEGORY_LABELS[doc.category] ?? doc.category}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Noch keine Dokumente.</p>
          )}
          <Link
            href="/portal/upload"
            className="mt-4 block text-xs text-gray-400 hover:text-gray-700"
          >
            Dateien hochladen →
          </Link>
        </div>
      </div>
    </div>
  )
}
