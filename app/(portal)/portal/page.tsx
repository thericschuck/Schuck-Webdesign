import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatusTimeline } from '@/components/portal/StatusTimeline'
import { PWAInstallPrompt } from '@/components/public/PWAInstallPrompt'
import type { ProjectStatus } from '@/types/database'

const BANNER_STARS = [
  { top: '12%', left: '8%',  size: 2, alpha: 0.70, glow: false, delay: 0.0 },
  { top: '18%', left: '14%', size: 3, alpha: 0.85, glow: true,  delay: 0.8 },
  { top: '8%',  left: '32%', size: 2, alpha: 0.55, glow: false, delay: 2.1 },
  { top: '28%', left: '36%', size: 2, alpha: 0.60, glow: false, delay: 1.5 },
  { top: '20%', left: '78%', size: 4, alpha: 0.90, glow: true,  delay: 0.3 },
  { top: '6%',  left: '56%', size: 2, alpha: 0.50, glow: false, delay: 1.9 },
  { top: '45%', left: '93%', size: 3, alpha: 0.75, glow: true,  delay: 1.1 },
  { top: '62%', left: '64%', size: 2, alpha: 0.60, glow: false, delay: 0.6 },
  { top: '70%', left: '23%', size: 3, alpha: 0.70, glow: true,  delay: 1.8 },
  { top: '54%', left: '88%', size: 2, alpha: 0.55, glow: false, delay: 0.4 },
  { top: '82%', left: '45%', size: 3, alpha: 0.65, glow: false, delay: 1.3 },
  { top: '38%', left: '5%',  size: 2, alpha: 0.50, glow: false, delay: 2.4 },
  { top: '75%', left: '72%', size: 4, alpha: 0.80, glow: true,  delay: 0.9 },
  { top: '15%', left: '48%', size: 2, alpha: 0.55, glow: false, delay: 1.6 },
  { top: '88%', left: '18%', size: 2, alpha: 0.45, glow: false, delay: 0.7 },
  { top: '50%', left: '50%', size: 2, alpha: 0.40, glow: false, delay: 2.8 },
]

const STATUS_LABEL: Record<ProjectStatus, string> = {
  briefing: 'Briefing',
  design: 'Design',
  development: 'Entwicklung',
  review: 'Review',
  live: 'Live',
}

const STATUS_COLOR: Record<ProjectStatus, string> = {
  briefing: 'bg-[#ECE7DD] text-[#6B655D]',
  design: 'bg-[#EAE9FF] text-[#6159C6]',
  development: 'bg-[#F6E7D5] text-[#B76B1D]',
  review: 'bg-[#EEE5FF] text-[#7A59C9]',
  live: 'bg-[#E2F4EA] text-[#227A4A]',
}

const STATUS_ACCENT: Record<ProjectStatus, string> = {
  briefing: 'bg-[#D4CCC0]',
  design: 'bg-[#7F77DD]',
  development: 'bg-[#E39A4B]',
  review: 'bg-[#9A72E1]',
  live: 'bg-[#3DA86C]',
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

  const [{ data: client }, { data: profile }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, company_name')
      .eq('profile_id', user!.id)
      .single(),
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user!.id)
      .single(),
  ])

  const displayName = profile?.full_name || user!.email?.split('@')[0] || 'Willkommen'

  if (!client) {
    return (
      <div className="rounded-3xl border border-black/6 bg-[#F1EEE7] p-8 text-center">
        <p className="text-sm text-[#7C756B]" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Kein Kundeneintrag gefunden. Bitte kontaktiere uns.
        </p>
      </div>
    )
  }

  // Projekte + Dokumente parallel laden
  const [{ data: projects }, { data: documents }] = await Promise.all([
    supabase
      .from('projects')
      .select(`id, title, description, status, start_date, launch_date, created_at, project_updates(id, message, created_at)`)
      .eq('client_id', client.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('documents')
      .select('id, name, created_at')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  return (
    <div className="space-y-10">
      <PWAInstallPrompt />
      <div
        className="relative overflow-hidden rounded-4xl border border-white/6 bg-[#080808] px-7 py-8 md:px-10 md:py-10"
        style={{ boxShadow: '0 14px 48px rgba(0,0,0,0.18)' }}
      >
        <style>{`
          @keyframes star-twinkle {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%       { opacity: 0.15; transform: scale(0.5); }
          }
        `}</style>
        <div className="absolute -top-10 -right-10 h-52 w-52 rounded-full bg-[#7F77DD]/14 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 left-1/3 h-64 w-64 rounded-full bg-[#7F77DD]/10 blur-3xl pointer-events-none" />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 50% 42%, rgba(127,119,221,0.12) 0%, transparent 72%)',
          }}
        />
        {BANNER_STARS.map((star, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute rounded-full pointer-events-none"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              background: `rgba(235,235,255,${star.alpha})`,
              boxShadow: star.glow
                ? `0 0 ${star.size * 4}px ${star.size}px rgba(127,119,221,${star.alpha * 0.7}), 0 0 ${star.size * 2}px rgba(200,198,255,${star.alpha * 0.5})`
                : `0 0 ${star.size * 2}px rgba(200,198,255,${star.alpha * 0.3})`,
              animation: `star-twinkle ${2.5 + (i % 4) * 0.6}s ease-in-out ${star.delay}s infinite`,
            }}
          />
        ))}

        <p
          className="relative z-10 mb-3 text-[11px] uppercase tracking-[0.14em] text-[#7F77DD]"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Willkommen zurück
        </p>
        <h1
          className="relative z-10 text-4xl md:text-5xl tracking-tight text-[#F5F5F0]"
          style={{ fontFamily: 'var(--font-fraunces)' }}
        >
          {displayName}
        </h1>
        <p
          className="relative z-10 mt-3 text-sm text-white/50"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {(projects ?? []).length === 0
            ? 'Noch kein Projekt angelegt.'
            : (projects ?? []).length === 1
            ? '1 aktives Projekt'
            : `${(projects ?? []).length} aktive Projekte`}
        </p>
      </div>

      <section>
        <h2
          className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#999]"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {(projects ?? []).length === 1 ? 'Dein Projekt' : 'Deine Projekte'}
        </h2>

        {(projects ?? []).length === 0 ? (
          <div className="rounded-3xl border border-black/6 bg-[#F1EEE7] p-10 text-center">
            <p className="text-sm text-[#7C756B]" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Noch kein Projekt angelegt.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  className="group relative block overflow-hidden rounded-[26px] border border-black/6 bg-[#F7F5F0] transition-all duration-200 hover:-translate-y-0.5"
                  style={{ boxShadow: '0 6px 24px rgba(0,0,0,0.06)' }}
                >
                  <div className={`h-1 w-full ${STATUS_ACCENT[status]}`} />

                  <div className="p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <h3
                        className="text-xl leading-snug text-[#1C1C1E]"
                        style={{ fontFamily: 'var(--font-fraunces)' }}
                      >
                        {project.title}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[status]}`}
                        style={{ fontFamily: 'var(--font-dm-sans)' }}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </div>

                    {project.description && (
                      <p
                        className="mb-4 -mt-2 truncate text-xs text-[#8A847B]"
                        style={{ fontFamily: 'var(--font-dm-sans)' }}
                      >
                        {project.description}
                      </p>
                    )}

                    <StatusTimeline status={status} />

                    <div className="mt-4 flex items-start justify-between gap-4 border-t border-black/6 pt-3.5">
                      {lastUpdate ? (
                        <div className="min-w-0 flex-1">
                          <p
                            className="line-clamp-1 text-xs leading-snug text-[#55504A]"
                            style={{ fontFamily: 'var(--font-dm-sans)' }}
                          >
                            {lastUpdate.message}
                          </p>
                          <p
                            className="mt-0.5 text-xs text-[#9C968B]"
                            style={{ fontFamily: 'var(--font-dm-sans)' }}
                          >
                            {formatRelative(lastUpdate.created_at)}
                          </p>
                        </div>
                      ) : (
                        <p
                          className="flex-1 text-xs text-[#B8B1A6]"
                          style={{ fontFamily: 'var(--font-dm-sans)' }}
                        >
                          Noch keine Updates
                        </p>
                      )}
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#C2BBB0] transition-colors group-hover:text-[#7F77DD]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
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

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#999]"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Dokumente
          </h2>
          <Link
            href="/portal/documents"
            className="text-xs text-[#8A847B] transition-colors hover:text-[#1C1C1E]"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Alle anzeigen →
          </Link>
        </div>

        <div
          className="overflow-hidden rounded-[26px] border border-black/6 bg-[#F7F5F0]"
          style={{ boxShadow: '0 6px 24px rgba(0,0,0,0.06)' }}
        >
          {documents && documents.length > 0 ? (
            <ul className="divide-y divide-black/5">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
                  <svg className="h-4 w-4 shrink-0 text-[#C1BAAF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p
                    className="flex-1 truncate text-sm text-[#3D3833]"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    {doc.name}
                  </p>
                  <span
                    className="shrink-0 text-xs text-[#9C968B]"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    {formatRelative(doc.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-[#8A847B]" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Noch keine Dokumente.
              </p>
            </div>
          )}
          <div className="border-t border-black/5 px-4 py-3">
            <Link
              href="/portal/upload"
              className="text-xs text-[#8A847B] transition-colors hover:text-[#1C1C1E]"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Dateien hochladen →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
