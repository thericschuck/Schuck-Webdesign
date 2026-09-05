import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { DomainError } from './errors'
import { addNode as addKnowledgeNode } from './knowledge'
import { clientDisplayName } from '@/lib/client-name'
import type { Client, ClientStatus, Database } from '@/types/database'

type ClientUpdate = Database['public']['Tables']['clients']['Update']

export const CLIENT_STATUS_VALUES: ClientStatus[] = [
  'lead',
  'pending',
  'active',
  'paused',
  'inactive',
  'completed',
]

const UPDATABLE_CLIENT_FIELDS = [
  'company_name',
  'contact_name',
  'first_name',
  'last_name',
  'contact_email',
  'website',
  'phone',
  'status',
  'address_street',
  'address_city',
  'address_zip',
  'address_country',
  'notes',
] as const

export interface ProjectListItem {
  id: string
  project_number: string | null
  title: string
  status: string
  launch_date: string | null
  created_at: string
}

export interface ClientWithProjects extends Client {
  projects: ProjectListItem[]
}

export interface ListClientsFilter {
  status?: ClientStatus
}

export async function listClients(filter: ListClientsFilter = {}): Promise<Client[]> {
  const adminClient = createAdminClient()
  let query = adminClient
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (filter.status) query = query.eq('status', filter.status)

  const { data, error } = await query
  if (error) throw new DomainError(error.message)
  return data
}

export async function getClient(clientId: string): Promise<ClientWithProjects> {
  const adminClient = createAdminClient()

  const [{ data: client, error: clientError }, { data: projects, error: projectsError }] = await Promise.all([
    adminClient.from('clients').select('*').eq('id', clientId).single(),
    adminClient
      .from('projects')
      .select('id, project_number, title, status, launch_date, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
  ])

  if (clientError) throw new DomainError('Kunde nicht gefunden.')
  if (projectsError) throw new DomainError(projectsError.message)

  return { ...client, projects: projects ?? [] }
}

export interface CreateClientInput {
  /**
   * UUID des zugehörigen auth-Users/Profils — wird vorab über den Invite-Flow
   * (lib/auth/invite-client.ts) erzeugt. Optional: ohne Einladung wird der Kunde
   * ohne Portal-Zugang angelegt (profile_id bleibt NULL), Anzeigename/E-Mail
   * kommen dann aus contactName/contactEmail.
   */
  profileId?: string | null
  /** Ansprechpartner-Name, auch ohne Portal-Zugang gepflegt — Fallback-Anzeigename vor profiles.full_name. */
  contactName?: string | null
  /** Vorname/Nachname sind reine Zusatzinfo neben dem freien Anzeigenamen (contactName/full_name). */
  firstName?: string | null
  lastName?: string | null
  /** Fallback-E-Mail für Versand-Flows, solange kein Portal-Zugang (profiles.email) existiert. */
  contactEmail?: string | null
  /** Firmenname ist optionale Zusatzinfo — der primäre Kundenname liegt auf profiles.full_name/contactName. */
  companyName?: string | null
  status?: ClientStatus
  website?: string | null
  phone?: string | null
  addressStreet?: string | null
  addressCity?: string | null
  addressZip?: string | null
  addressCountry?: string | null
  notes?: string | null
  /** Für den Invite-Flow: wann die Einladungs-E-Mail versendet wurde. */
  inviteSentAt?: string | null
}

/**
 * Legt die clients-Zeile an und vergibt die nächste KD-Nummer. Enthält bewusst
 * KEINEN E-Mail-Versand — eine profileId muss bereits über den eigenständigen
 * Invite-Flow (lib/auth/invite-client.ts) erzeugt worden sein, falls gewünscht.
 * Ohne profileId entsteht ein Kunde ohne Portal-Zugang (siehe attachClientProfile()
 * für das spätere Nachholen der Einladung).
 */
export async function createClient(input: CreateClientInput): Promise<Client> {
  const companyName = input.companyName?.trim() || null
  const contactName = input.contactName?.trim() || null
  const firstName = input.firstName?.trim() || null
  const lastName = input.lastName?.trim() || null
  const contactEmail = input.contactEmail?.trim() || null

  const status = input.status ?? 'pending'
  if (!CLIENT_STATUS_VALUES.includes(status)) {
    throw new DomainError(`Ungültiger Status "${status}".`)
  }

  const adminClient = createAdminClient()

  const { data: seq, error: seqError } = await adminClient.rpc('get_next_number', {
    p_typ: 'KD',
    p_scope: '',
  })
  if (seqError) throw new DomainError(seqError.message)
  const clientNumber = `KD-${String(seq).padStart(3, '0')}`

  const { data: client, error: clientError } = await adminClient
    .from('clients')
    .insert({
      profile_id: input.profileId ?? null,
      company_name: companyName,
      contact_name: contactName,
      first_name: firstName,
      last_name: lastName,
      contact_email: contactEmail,
      client_number: clientNumber,
      status,
      website: input.website ?? null,
      phone: input.phone ?? null,
      address_street: input.addressStreet ?? null,
      address_city: input.addressCity ?? null,
      address_zip: input.addressZip ?? null,
      address_country: input.addressCountry ?? 'Deutschland',
      notes: input.notes ?? null,
      invite_sent_at: input.profileId ? (input.inviteSentAt ?? new Date().toISOString()) : null,
    })
    .select('*')
    .single()

  if (clientError) throw new DomainError(`Kunde konnte nicht gespeichert werden: ${clientError.message}`)

  try {
    let profileFullName: string | null = null
    if (input.profileId) {
      const { data: profile } = await adminClient.from('profiles').select('full_name').eq('id', input.profileId).single()
      profileFullName = profile?.full_name ?? null
    }
    const bodyParts = [
      client.website,
      client.phone,
      [client.address_street, client.address_zip, client.address_city].filter(Boolean).join(' '),
    ].filter(Boolean)
    await addKnowledgeNode({
      type: 'client',
      label: clientDisplayName(profileFullName, client.contact_name, client.company_name),
      body: bodyParts.length > 0 ? bodyParts.join(' · ') : null,
      refId: client.id,
      refTable: 'clients',
      source: 'jarvis_auto',
    })
  } catch (error) {
    console.error('[clients] Knowledge-Node konnte nicht angelegt werden:', error instanceof Error ? error.message : error)
  }

  revalidateTag('admin-graph', 'max')
  return client
}

/**
 * Verknüpft nachträglich ein Portal-Profil mit einem bereits bestehenden, profillosen Kunden —
 * das Gegenstück zu createClient() ohne profileId. Aufrufer müssen vorher über
 * lib/auth/invite-client.ts#inviteClientUser() eine profileId erzeugt haben.
 */
export async function attachClientProfile(clientId: string, profileId: string): Promise<Client> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('clients')
    .update({ profile_id: profileId, invite_sent_at: new Date().toISOString() })
    .eq('id', clientId)
    .select('*')
    .single()

  if (error) throw new DomainError(`Portal-Zugang konnte nicht verknüpft werden: ${error.message}`)
  revalidateTag('admin-graph', 'max')
  return data
}

export interface UpdateClientInput {
  company_name?: string | null
  contact_name?: string | null
  first_name?: string | null
  last_name?: string | null
  contact_email?: string | null
  website?: string | null
  phone?: string | null
  status?: ClientStatus
  address_street?: string | null
  address_city?: string | null
  address_zip?: string | null
  address_country?: string | null
  notes?: string | null
}

export async function updateClient(clientId: string, patch: UpdateClientInput): Promise<Client> {
  const updates: Record<string, unknown> = {}
  for (const key of UPDATABLE_CLIENT_FIELDS) {
    if (patch[key] !== undefined) updates[key] = patch[key]
  }

  if (Object.keys(updates).length === 0) {
    throw new DomainError('Keine Felder zum Aktualisieren angegeben.')
  }
  if (updates.status !== undefined && !CLIENT_STATUS_VALUES.includes(updates.status as ClientStatus)) {
    throw new DomainError(`Ungültiger Status "${updates.status}".`)
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('clients')
    .update(updates as ClientUpdate)
    .eq('id', clientId)
    .select('*')
    .single()

  if (error) throw new DomainError(error.message)

  if (updates.contact_email !== undefined && data.profile_id) {
    await syncProfileEmail(data.profile_id, updates.contact_email as string | null)
  }

  revalidateTag('admin-graph', 'max')
  return data
}

/**
 * Hält die Login-Adresse mit der Kontaktadresse zusammen. Ohne das läuft eine
 * "Erneut einladen"-Aktion nach einer E-Mail-Korrektur weiter an die ALTE Adresse:
 * Einladungslinks gehören immer zum auth-User, nicht zu clients.contact_email —
 * und ein Invite an eine abweichende Adresse würde einen zweiten Account anlegen.
 *
 * Bewusst nicht blockierend: die Kundendaten sind bereits gespeichert, ein
 * Fehlschlag hier darf das Formular nicht scheitern lassen.
 */
async function syncProfileEmail(profileId: string, rawEmail: string | null): Promise<void> {
  const email = rawEmail?.trim().toLowerCase()
  if (!email) return

  const adminClient = createAdminClient()

  const { data: profile } = await adminClient.from('profiles').select('email').eq('id', profileId).single()
  if (profile?.email === email) return

  const { error: authError } = await adminClient.auth.admin.updateUserById(profileId, { email })
  if (authError) {
    console.error('[clients] Login-E-Mail konnte nicht aktualisiert werden:', authError.message)
    return
  }

  const { error: profileError } = await adminClient.from('profiles').update({ email }).eq('id', profileId)
  if (profileError) {
    console.error('[clients] profiles.email konnte nicht aktualisiert werden:', profileError.message)
  }
}

export interface DeleteClientResult {
  displayName: string
}

/**
 * Löscht Kunde + Portal-Zugang (falls vorhanden) unwiderruflich. Das Entfernen
 * des auth-Users gehört hier zur Domain-Logik (nicht zum Invite-Flow) — es ist
 * der einzige Weg, das ON-DELETE-CASCADE profiles → clients auszulösen. Bei
 * einem Kunden ohne Portal-Zugang (profile_id null) entfällt dieser Schritt.
 */
export async function deleteClient(clientId: string): Promise<DeleteClientResult> {
  const adminClient = createAdminClient()

  const { data: client } = await adminClient
    .from('clients')
    .select('profile_id, company_name, contact_name, profiles(full_name)')
    .eq('id', clientId)
    .single()

  if (!client) throw new DomainError('Kunde nicht gefunden.')

  const profile = Array.isArray(client.profiles) ? client.profiles[0] : client.profiles
  const displayName = clientDisplayName(profile?.full_name, client.contact_name, client.company_name)

  const { data: projects } = await adminClient.from('projects').select('id').eq('client_id', clientId)
  const projectIds = (projects ?? []).map((p) => p.id)

  if (projectIds.length > 0) {
    await adminClient.from('messages').delete().in('project_id', projectIds)
    await adminClient.from('change_requests').delete().in('project_id', projectIds)
    await adminClient.from('reviews').delete().in('project_id', projectIds)
  }

  if (client.profile_id) {
    await adminClient.from('reviews').delete().eq('client_id', client.profile_id)

    const { error } = await adminClient.auth.admin.deleteUser(client.profile_id)
    if (error) throw new DomainError(`Fehler beim Löschen: ${error.message}`)
  } else {
    const { error } = await adminClient.from('clients').delete().eq('id', clientId)
    if (error) throw new DomainError(`Fehler beim Löschen: ${error.message}`)
  }

  revalidateTag('admin-graph', 'max')
  return { displayName }
}
