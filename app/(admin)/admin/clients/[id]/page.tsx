import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ClientStatus, ProjectStatus } from '@/types/database'
import { clientDisplayName, clientDisplaySubtitle } from '@/lib/client-name'
import { DeleteClientButton } from './DeleteClientButton'
import { ResendInviteButton } from './ResendInviteButton'
import { ClientDocuments } from './ClientDocuments'
import { inviteExistingClient } from './actions'

const INVITE_EXPIRY_HOURS = 24

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

const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  lead: 'Lead',
  pending: 'Ausstehend',
  active: 'Aktiv',
  paused: 'Pausiert',
  completed: 'Abgeschlossen',
  inactive: 'Inaktiv',
}

const CLIENT_STATUS_COLOR: Record<ClientStatus, string> = {
  lead: 'bg-purple-50 text-purple-700',
  pending: 'bg-amber-50 text-amber-700',
  active: 'bg-green-50 text-green-700',
  paused: 'bg-orange-50 text-orange-700',
  completed: 'bg-blue-50 text-blue-700',
  inactive: 'bg-gray-100 text-gray-500',
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select(`
      id,
      client_number,
      company_name,
      contact_name,
      contact_email,
      website,
      phone,
      status,
      created_at,
      invite_sent_at,
      address_street,
      address_city,
      address_zip,
      address_country,
      notes,
      profile:profiles(id, full_name, email),
      projects(id, project_number, title, status, start_date, launch_date, created_at)
    `)
    .eq('id', id)
    .single()

  if (!client) notFound()

  const profile = Array.isArray(client.profile) ? client.profile[0] : client.profile
  const projects = client.projects ?? []
  const displayName = clientDisplayName(profile?.full_name, client.contact_name, client.company_name)
  const displaySubtitle = clientDisplaySubtitle(profile?.full_name, client.contact_name, client.company_name)
  const email = profile?.email ?? client.contact_email

  const [{ data: offers }, { data: documents }] = await Promise.all([
    supabase.from('offers').select('id, offer_number').eq('client_id', client.id).order('created_at', { ascending: false }),
    supabase.from('documents').select('id, name, created_at').eq('client_id', client.id).order('created_at', { ascending: false }),
  ])

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/clients" className="hover:text-gray-600 transition-colors">Kunden</Link>
        <span>/</span>
        <span className="text-gray-700">{displayName}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600 text-xl font-bold shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              {client.client_number && (
                <span className="text-xs text-gray-400 font-mono" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {client.client_number}
                </span>
              )}
              <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
                {displayName}
              </h1>
            </div>
            {displaySubtitle && (
              <p className="text-sm text-gray-400 mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {displaySubtitle}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${CLIENT_STATUS_COLOR[client.status]}`}
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {CLIENT_STATUS_LABEL[client.status]}
              </span>
              {!profile && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium border border-gray-200 text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Kein Portal-Zugang
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 sm:shrink-0">
          <Link
            href={`/admin/projects/new?client_id=${client.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Projekt anlegen
          </Link>
          <Link
            href={`/admin/clients/${client.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Bearbeiten
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Info card */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Kontaktdaten
            </h2>
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>Name</dt>
                <dd className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {profile?.full_name ?? client.contact_name ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>E-Mail</dt>
                <dd className="text-sm text-gray-800 break-all" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {email ?? '—'}
                </dd>
              </div>
              {client.phone && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>Telefon</dt>
                  <dd className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-dm-sans)' }}>{client.phone}</dd>
                </div>
              )}
              {client.website && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>Website</dt>
                  <dd className="text-sm text-blue-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    <a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {client.website}
                    </a>
                  </dd>
                </div>
              )}
              {(client.address_street || client.address_city) && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>Adresse</dt>
                  <dd className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {client.address_street && <span className="block">{client.address_street}</span>}
                    {(client.address_zip || client.address_city) && (
                      <span className="block">
                        {[client.address_zip, client.address_city].filter(Boolean).join(' ')}
                      </span>
                    )}
                    {client.address_country && client.address_country !== 'Deutschland' && (
                      <span className="block">{client.address_country}</span>
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>Kunde seit</dt>
                <dd className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {new Date(client.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                </dd>
              </div>
            </dl>
          </div>

          {/* Interne Notizen */}
          {client.notes && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Interne Notizen
              </h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {client.notes}
              </p>
            </div>
          )}

          {/* Dokumente */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Dokumente
            </h2>
            <ClientDocuments clientId={client.id} clientEmail={email ?? null} offers={offers ?? []} documents={documents ?? []} />
          </div>

          {/* Portal-Zugang: noch kein Profil verknüpft — nachträglich einladen */}
          {!profile && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Portal-Zugang
              </h2>
              <p className="text-xs text-gray-400 mb-4" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Dieser Kunde wurde ohne Einladung angelegt. Hier kannst du den Portal-Zugang jederzeit nachholen.
              </p>
              <form
                action={async (formData: FormData) => {
                  'use server'
                  await inviteExistingClient(client.id, formData)
                }}
                className="flex flex-col gap-3"
              >
                <div>
                  <label className="text-xs text-gray-400 mb-1 block" style={{ fontFamily: 'var(--font-dm-sans)' }}>Name</label>
                  <input
                    type="text"
                    name="full_name"
                    defaultValue={client.contact_name ?? ''}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block" style={{ fontFamily: 'var(--font-dm-sans)' }}>E-Mail</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={client.contact_email ?? ''}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gray-900 text-white text-sm font-medium rounded-xl py-2.5 hover:bg-gray-700 transition-colors"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  Einladen
                </button>
              </form>
            </div>
          )}

          {/* Invite status — nur für ausstehende Kunden mit bereits verknüpftem Profil */}
          {profile && client.status === 'pending' && (() => {
            const sentAt = client.invite_sent_at ?? client.created_at
            const sentDate = new Date(sentAt)
            const expiresDate = new Date(sentDate.getTime() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000)
            const isExpired = new Date() > expiresDate

            const fmtDate = (d: Date) =>
              d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) +
              ', ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr'

            return (
              <div className={`rounded-2xl border shadow-sm p-5 ${isExpired ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    Einladungslink
                  </h2>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${isExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    {isExpired ? 'Abgelaufen' : 'Aktiv'}
                  </span>
                </div>
                <dl className="flex flex-col gap-2 mb-4">
                  <div>
                    <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>Gesendet</dt>
                    <dd className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-dm-sans)' }}>{fmtDate(sentDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {isExpired ? 'Abgelaufen am' : 'Läuft ab am'}
                    </dt>
                    <dd className={`text-sm font-medium ${isExpired ? 'text-red-700' : 'text-amber-700'}`} style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {fmtDate(expiresDate)}
                    </dd>
                  </div>
                </dl>
                <ResendInviteButton clientId={client.id} />
              </div>
            )
          })()}

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Gefahrenbereich
            </h2>
            <DeleteClientButton clientId={client.id} displayName={displayName} />
          </div>
        </div>

        {/* Projects */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Projekte ({projects.length})
              </h2>
              <Link
                href={`/admin/projects/new?client_id=${client.id}`}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                + Neu
              </Link>
            </div>

            {projects.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/admin/projects/${project.id}`}
                    className="flex items-center gap-3 px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {project.project_number && (
                          <span className="text-xs text-gray-400 font-mono shrink-0" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                            {project.project_number}
                          </span>
                        )}
                        <p className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {project.title}
                        </p>
                      </div>
                      {project.start_date && (
                        <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          Start: {new Date(project.start_date).toLocaleDateString('de-DE')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[project.status]}`}
                        style={{ fontFamily: 'var(--font-dm-sans)' }}
                      >
                        {STATUS_LABEL[project.status]}
                      </span>
                      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-6 py-10 text-center">
                <p className="text-gray-400 text-sm mb-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Noch kein Projekt angelegt.
                </p>
                <Link
                  href={`/admin/projects/new?client_id=${client.id}`}
                  className="text-sm font-medium text-gray-900 hover:underline"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  Erstes Projekt anlegen →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
