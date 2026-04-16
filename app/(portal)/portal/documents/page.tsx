import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { ProjectStatus } from '@/types/database'

const STATUS_LABEL: Record<ProjectStatus, string> = {
  briefing:    'Briefing',
  design:      'Design',
  development: 'Entwicklung',
  review:      'Review',
  live:        'Live',
}

const STATUS_COLOR: Record<ProjectStatus, string> = {
  briefing:    'bg-gray-100 text-gray-600',
  design:      'bg-blue-50 text-blue-700',
  development: 'bg-amber-50 text-amber-700',
  review:      'bg-purple-50 text-purple-700',
  live:        'bg-green-50 text-green-700',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fileExt(name: string) {
  return name.split('.').pop()?.toUpperCase() ?? 'FILE'
}

type DocRow = {
  id: string
  name: string
  file_url: string
  folder: string | null
  created_at: string
  signedUrl: string | null
}

async function getSignedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fileUrl: string
) {
  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(fileUrl, 3600)
  return data?.signedUrl ?? null
}

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('profile_id', user!.id)
    .single()

  if (!client) {
    return <p className="text-sm text-gray-500">Kein Kundeneintrag gefunden.</p>
  }

  // Projekte mit ihren Dokumenten laden
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, status, documents(id, name, file_url, folder, created_at)')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  // Dokumente ohne Projektbezug
  const { data: orphanDocs } = await supabase
    .from('documents')
    .select('id, name, file_url, folder, created_at')
    .eq('client_id', client.id)
    .is('project_id', null)
    .order('created_at', { ascending: false })

  // Signed URLs für alle Docs generieren
  async function enrichDocs(docs: typeof orphanDocs): Promise<DocRow[]> {
    return Promise.all(
      (docs ?? []).map(async (d) => ({
        ...d,
        signedUrl: await getSignedUrl(supabase, d.file_url),
      }))
    )
  }

  const projectsWithUrls = await Promise.all(
    (projects ?? []).map(async (p) => ({
      ...p,
      documents: await enrichDocs(
        (p.documents ?? []).map((d) => ({ ...d, project_id: p.id }))
      ),
    }))
  )

  const orphanWithUrls = await enrichDocs(orphanDocs)

  const totalCount =
    projectsWithUrls.reduce((s, p) => s + p.documents.length, 0) +
    orphanWithUrls.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dokumente</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCount} {totalCount === 1 ? 'Dokument' : 'Dokumente'} insgesamt
          </p>
        </div>
        <Link
          href="/portal/upload"
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Hochladen
        </Link>
      </div>

      {totalCount === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <p className="text-sm text-gray-400">Noch keine Dokumente vorhanden.</p>
          <Link href="/portal/upload" className="mt-3 inline-block text-sm font-medium text-gray-900 hover:underline">
            Erste Datei hochladen →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Dokumente pro Projekt */}
          {projectsWithUrls.map((project) => (
            <ProjectSection
              key={project.id}
              title={project.title}
              status={project.status as ProjectStatus}
              documents={project.documents}
            />
          ))}

          {/* Dokumente ohne Projekt */}
          {orphanWithUrls.length > 0 && (
            <ProjectSection
              title="Allgemein"
              status={null}
              documents={orphanWithUrls}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Projekt-Sektion ────────────────────────────────────────────────────────

function ProjectSection({
  title,
  status,
  documents,
}: {
  title: string
  status: ProjectStatus | null
  documents: DocRow[]
}) {
  if (documents.length === 0) return null

  // Nach Ordner gruppieren
  const folderMap = new Map<string, DocRow[]>()
  for (const doc of documents) {
    const folder = doc.folder?.trim() || 'Allgemein'
    if (!folderMap.has(folder)) folderMap.set(folder, [])
    folderMap.get(folder)!.push(doc)
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Projekt-Header */}
      <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {status && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[status]}`}>
              {STATUS_LABEL[status]}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{documents.length} {documents.length === 1 ? 'Datei' : 'Dateien'}</span>
      </div>

      {/* Ordner */}
      {Array.from(folderMap.entries()).map(([folder, docs], i, arr) => (
        <div key={folder}>
          {/* Ordner-Header (nur wenn mehrere Ordner oder Ordnername nicht "Allgemein") */}
          {(folderMap.size > 1 || folder !== 'Allgemein') && (
            <div className="px-5 py-2 bg-white border-b border-gray-50 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span className="text-xs font-medium text-gray-500">{folder}</span>
              <span className="text-xs text-gray-300 ml-auto">{docs.length}</span>
            </div>
          )}

          <ul className={`divide-y divide-gray-50 ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-gray-500 leading-none">{fileExt(doc.name)}</span>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400">{formatDate(doc.created_at)}</p>
                </div>
                {doc.signedUrl ? (
                  <a
                    href={doc.signedUrl}
                    download={doc.name}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </a>
                ) : (
                  <span className="text-xs text-gray-300">Nicht verfügbar</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
