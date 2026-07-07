import { createAdminClient } from '@/lib/supabase/admin'
import { inviteClientUser } from '@/lib/auth/invite-client'
import { sendEmail } from '@/lib/email/send'
import { DomainError } from './errors'
import { createClient as createClientRecord } from './clients'
import type {
  AkquiseErgebnis,
  ClientStatus,
  Database,
  Lead,
  LeadPrioritaet,
  LeadStage,
  QualiErgebnis,
  SalesErgebnis,
} from '@/types/database'

type LeadUpdate = Database['public']['Tables']['leads']['Update']

export const LEAD_STAGE_VALUES: LeadStage[] = ['erstkontakt', 'quali_call', 'closing_call', 'gewonnen', 'verloren']
export const LEAD_PRIORITAET_VALUES: LeadPrioritaet[] = ['high', 'medium', 'low']
export const AKQUISE_ERGEBNIS_VALUES: AkquiseErgebnis[] = [
  'offen',
  'nicht_erreicht',
  'wiedervorlage',
  'kein_interesse',
  'qualifiziert',
]
export const QUALI_ERGEBNIS_VALUES: QualiErgebnis[] = ['offen', 'follow_up', 'qualifiziert', 'disqualifiziert']
export const SALES_ERGEBNIS_VALUES: SalesErgebnis[] = ['offen', 'follow_up', 'abgeschlossen', 'abgelehnt']

const UPDATABLE_LEAD_FIELDS = [
  'firmenname',
  'ansprechpartner',
  'position',
  'zielgruppe',
  'stadt',
  'website',
  'phone',
  'email',
  'quelle',
  'website_qualitaet',
  'prioritaet',
  'erstkontakt_am',
  'akquise_ergebnis',
  'wiedervorlage',
  'notizen',
  'current_stage',
] as const

// ── list_contact_submissions ─────────────────────────────────────────────────

export interface ListContactSubmissionsFilter {
  includeRead?: boolean
}

export async function listContactSubmissions(filter: ListContactSubmissionsFilter = {}) {
  const adminClient = createAdminClient()
  let query = adminClient
    .from('contact_submissions')
    .select('id, name, email, phone, type, message, read, created_at')
    .order('created_at', { ascending: false })

  if (!filter.includeRead) query = query.eq('read', false)

  const { data, error } = await query
  if (error) throw new DomainError(error.message)
  return data
}

/**
 * Übernimmt eine Kontaktanfrage als Lead. Das Kontaktformular kennt keinen
 * Firmennamen — der Anfragename wird als firmenname UND ansprechpartner
 * übernommen; Eric kann den Firmennamen anschließend im Lead editieren.
 */
export async function convertContactSubmissionToLead(submissionId: string): Promise<Lead> {
  const adminClient = createAdminClient()

  const { data: submission, error: submissionError } = await adminClient
    .from('contact_submissions')
    .select('*')
    .eq('id', submissionId)
    .single()
  if (submissionError) throw new DomainError('Kontaktanfrage nicht gefunden.')

  const lead = await createLead({
    firmenname: submission.name,
    ansprechpartner: submission.name,
    email: submission.email,
    phone: submission.phone,
    quelle: 'Website',
    notizen: `Anfrage-Typ: ${submission.type}\n\n${submission.message}`,
  })

  await adminClient.from('contact_submissions').update({ read: true }).eq('id', submissionId)

  return lead
}

// ── leads ─────────────────────────────────────────────────────────────────────

export interface ListLeadsFilter {
  currentStage?: LeadStage
  prioritaet?: LeadPrioritaet
  quelle?: string
  /** true = nur Leads mit wiedervorlage <= heute (fällig); false/undefined = kein Filter. */
  wiedervorlageDue?: boolean
  search?: string
}

export async function listLeads(filter: ListLeadsFilter = {}) {
  const adminClient = createAdminClient()
  let query = adminClient
    .from('leads')
    .select(
      'id, lead_number, firmenname, zielgruppe, stadt, quelle, prioritaet, akquise_ergebnis, current_stage, wiedervorlage, created_at'
    )
    .order('created_at', { ascending: false })

  if (filter.currentStage) query = query.eq('current_stage', filter.currentStage)
  if (filter.prioritaet) query = query.eq('prioritaet', filter.prioritaet)
  if (filter.quelle) query = query.eq('quelle', filter.quelle)
  if (filter.wiedervorlageDue) {
    query = query.not('wiedervorlage', 'is', null).lte('wiedervorlage', new Date().toISOString().slice(0, 10))
  }
  if (filter.search) {
    query = query.ilike('firmenname', `%${filter.search}%`)
  }

  const { data, error } = await query
  if (error) throw new DomainError(error.message)
  return data
}

export async function getLead(leadId: string) {
  const adminClient = createAdminClient()

  const [
    { data: lead, error: leadError },
    { data: qualiCalls, error: qualiError },
    { data: salesCalls, error: salesError },
    { data: offers, error: offersError },
  ] = await Promise.all([
    adminClient.from('leads').select('*').eq('id', leadId).single(),
    adminClient.from('quali_calls').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
    adminClient.from('sales_calls').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
    adminClient.from('offers').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
  ])

  if (leadError) throw new DomainError('Lead nicht gefunden.')
  if (qualiError) throw new DomainError(qualiError.message)
  if (salesError) throw new DomainError(salesError.message)
  if (offersError) throw new DomainError(offersError.message)

  return { ...lead, quali_calls: qualiCalls ?? [], sales_calls: salesCalls ?? [], offers: offers ?? [] }
}

export interface CreateLeadInput {
  firmenname: string
  ansprechpartner?: string | null
  position?: string | null
  zielgruppe?: string | null
  stadt?: string | null
  website?: string | null
  phone?: string | null
  email?: string | null
  quelle?: string | null
  websiteQualitaet?: string | null
  prioritaet?: LeadPrioritaet
  notizen?: string | null
}

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const firmenname = input.firmenname.trim()
  if (!firmenname) throw new DomainError('Firmenname ist erforderlich.')

  const adminClient = createAdminClient()

  const { data: seq, error: seqError } = await adminClient.rpc('get_next_number', { p_typ: 'L', p_scope: '' })
  if (seqError) throw new DomainError(seqError.message)
  const leadNumber = `L-${String(seq).padStart(3, '0')}`

  const { data, error } = await adminClient
    .from('leads')
    .insert({
      lead_number: leadNumber,
      firmenname,
      ansprechpartner: input.ansprechpartner ?? null,
      position: input.position ?? null,
      zielgruppe: input.zielgruppe ?? null,
      stadt: input.stadt ?? null,
      website: input.website ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      quelle: input.quelle ?? null,
      website_qualitaet: input.websiteQualitaet ?? null,
      prioritaet: input.prioritaet,
      notizen: input.notizen ?? null,
    })
    .select('*')
    .single()

  if (error) throw new DomainError(`Lead konnte nicht gespeichert werden: ${error.message}`)
  return data
}

export interface UpdateLeadInput {
  firmenname?: string
  ansprechpartner?: string | null
  position?: string | null
  zielgruppe?: string | null
  stadt?: string | null
  website?: string | null
  phone?: string | null
  email?: string | null
  quelle?: string | null
  website_qualitaet?: string | null
  prioritaet?: LeadPrioritaet
  erstkontakt_am?: string | null
  akquise_ergebnis?: AkquiseErgebnis
  wiedervorlage?: string | null
  notizen?: string | null
  current_stage?: LeadStage
}

export async function updateLead(leadId: string, patch: UpdateLeadInput): Promise<Lead> {
  const updates: Record<string, unknown> = {}
  for (const key of UPDATABLE_LEAD_FIELDS) {
    if (patch[key] !== undefined) updates[key] = patch[key]
  }

  if (Object.keys(updates).length === 0) {
    throw new DomainError('Keine Felder zum Aktualisieren angegeben.')
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('leads')
    .update(updates as LeadUpdate)
    .eq('id', leadId)
    .select('*')
    .single()

  if (error) throw new DomainError(error.message)
  return data
}

// ── quali/sales calls ─────────────────────────────────────────────────────────

export interface AddQualiCallInput {
  qualiCallAm?: string | null
  qualiErgebnis?: QualiErgebnis
  wiedervorlage?: string | null
  bedarfNotizen?: string | null
}

export async function addQualiCall(leadId: string, input: AddQualiCallInput) {
  const adminClient = createAdminClient()

  const { data: call, error } = await adminClient
    .from('quali_calls')
    .insert({
      lead_id: leadId,
      quali_call_am: input.qualiCallAm ?? null,
      quali_ergebnis: input.qualiErgebnis,
      wiedervorlage: input.wiedervorlage ?? null,
      bedarf_notizen: input.bedarfNotizen ?? null,
    })
    .select('*')
    .single()

  if (error) throw new DomainError(error.message)

  const { error: leadError } = await adminClient.from('leads').update({ current_stage: 'quali_call' }).eq('id', leadId)
  if (leadError) throw new DomainError(`Quali-Call gespeichert, aber Stage-Update fehlgeschlagen: ${leadError.message}`)

  return call
}

export interface AddSalesCallInput {
  closingCallAm?: string | null
  leistungen?: string | null
  angebotsvolumen?: number | null
  leistungsbeginn?: string | null
  salesErgebnis?: SalesErgebnis
  notizen?: string | null
}

export async function addSalesCall(leadId: string, input: AddSalesCallInput) {
  const adminClient = createAdminClient()

  const { data: call, error } = await adminClient
    .from('sales_calls')
    .insert({
      lead_id: leadId,
      closing_call_am: input.closingCallAm ?? null,
      leistungen: input.leistungen ?? null,
      angebotsvolumen: input.angebotsvolumen ?? null,
      leistungsbeginn: input.leistungsbeginn ?? null,
      sales_ergebnis: input.salesErgebnis,
      notizen: input.notizen ?? null,
    })
    .select('*')
    .single()

  if (error) throw new DomainError(error.message)

  const { error: leadError } = await adminClient.from('leads').update({ current_stage: 'closing_call' }).eq('id', leadId)
  if (leadError) throw new DomainError(`Sales-Call gespeichert, aber Stage-Update fehlgeschlagen: ${leadError.message}`)

  return call
}

// ── convert_lead_to_client ────────────────────────────────────────────────────

export interface ConvertLeadToClientInput {
  /** Nur Pflicht, wenn sendInvite=true — sonst als contactEmail übernommen (Fallback: lead.email). */
  email?: string
  /** Ob sofort eine Portal-Einladung verschickt wird. Default: false (Kunde ohne Portal-Zugang). */
  sendInvite?: boolean
  status?: ClientStatus
}

/**
 * Orchestriert optional den eigenständigen Invite-Flow (lib/auth/invite-client.ts) +
 * immer die Domain-Funktion createClient (lib/domain/clients.ts) und verknüpft
 * anschließend den Lead. Der E-Mail-Versand bleibt dadurch sichtbar als
 * eigener Schritt, nicht in generischer CRUD-Logik versteckt.
 */
export async function convertLeadToClient(leadId: string, input: ConvertLeadToClientInput) {
  const adminClient = createAdminClient()

  const { data: lead, error: leadError } = await adminClient.from('leads').select('*').eq('id', leadId).single()
  if (leadError) throw new DomainError('Lead nicht gefunden.')
  if (lead.client_id) throw new DomainError('Lead wurde bereits in einen Kunden umgewandelt.')

  let profileId: string | null = null
  if (input.sendInvite) {
    if (!input.email) throw new DomainError('E-Mail ist für die Portal-Einladung erforderlich.')
    ;({ profileId } = await inviteClientUser({ email: input.email, fullName: lead.ansprechpartner }))
  }

  const client = await createClientRecord({
    profileId,
    contactName: lead.ansprechpartner,
    contactEmail: input.email ?? lead.email,
    companyName: lead.firmenname,
    status: input.status,
    website: lead.website,
    phone: lead.phone,
    addressCity: lead.stadt,
  })

  const { error: updateError } = await adminClient
    .from('leads')
    .update({ client_id: client.id, current_stage: 'gewonnen' })
    .eq('id', leadId)

  if (updateError) {
    throw new DomainError(
      `Kunde ${client.client_number} wurde angelegt, aber der Lead konnte nicht verknüpft werden: ${updateError.message}`
    )
  }

  return { client, leadId, currentStage: 'gewonnen' as const }
}

// ── create_offer ────────────────────────────────────────────────────────────

export interface OfferItemInput {
  artNr?: string
  pktNr?: string
  bezeichnung?: string
  menge?: number
  ep: number
}

export interface CreateOfferInput {
  leadId?: string | null
  clientId?: string | null
  validUntil?: string | null
  items: OfferItemInput[]
}

export interface ResolvedOfferItem {
  art_nr: string | null
  pos: number
  bezeichnung: string
  menge: number
  ep: number
  gesamt: number
}

export async function createOffer(input: CreateOfferInput) {
  if (!input.leadId && !input.clientId) throw new DomainError('Entweder lead_id oder client_id ist erforderlich.')
  if (!input.items || input.items.length === 0) {
    throw new DomainError('items ist erforderlich und muss mindestens eine Position mit ep enthalten.')
  }

  const adminClient = createAdminClient()
  const resolvedItems: ResolvedOfferItem[] = []

  for (const [index, item] of input.items.entries()) {
    const menge = item.menge ?? 1
    let bezeichnung = item.bezeichnung ?? null
    let artNr: string | null = null

    if (item.artNr) {
      const { data: article, error } = await adminClient
        .from('articles')
        .select('art_nr, bezeichnung')
        .eq('art_nr', item.artNr)
        .single()
      if (error) throw new DomainError(`Artikel "${item.artNr}" nicht gefunden.`)
      artNr = article.art_nr
      bezeichnung = bezeichnung ?? article.bezeichnung
    } else if (item.pktNr) {
      const { data: pkg, error } = await adminClient
        .from('packages')
        .select('pkt_nr, paketname')
        .eq('pkt_nr', item.pktNr)
        .single()
      if (error) throw new DomainError(`Paket "${item.pktNr}" nicht gefunden.`)
      bezeichnung = bezeichnung ?? pkg.paketname
    }

    if (!bezeichnung) {
      throw new DomainError(`Position ${index + 1}: bezeichnung ist erforderlich, wenn weder art_nr noch pkt_nr angegeben ist.`)
    }

    resolvedItems.push({
      art_nr: artNr,
      pos: index + 1,
      bezeichnung,
      menge,
      ep: item.ep,
      gesamt: Math.round(menge * item.ep * 100) / 100,
    })
  }

  const totalNet = Math.round(resolvedItems.reduce((sum, i) => sum + i.gesamt, 0) * 100) / 100
  const year = String(new Date().getFullYear())

  const { data: seq, error: seqError } = await adminClient.rpc('get_next_number', { p_typ: 'AN', p_scope: year })
  if (seqError) throw new DomainError(seqError.message)
  const offerNumber = `AN-${year}-${String(seq).padStart(3, '0')}`

  const { data: offer, error: offerError } = await adminClient
    .from('offers')
    .insert({
      offer_number: offerNumber,
      lead_id: input.leadId ?? null,
      client_id: input.clientId ?? null,
      status: 'entwurf',
      total_net: totalNet,
      valid_until: input.validUntil ?? null,
    })
    .select('*')
    .single()

  if (offerError) throw new DomainError(`Angebot konnte nicht gespeichert werden: ${offerError.message}`)

  const { error: itemsError } = await adminClient
    .from('offer_items')
    .insert(resolvedItems.map((i) => ({ ...i, offer_id: offer.id })))
  if (itemsError) {
    throw new DomainError(`Angebot ${offerNumber} angelegt, aber Positionen konnten nicht gespeichert werden: ${itemsError.message}`)
  }

  return { ...offer, items: resolvedItems }
}

// ── draft_followup_email ──────────────────────────────────────────────────────

export async function draftFollowupEmail(leadId: string, anlass?: string | null) {
  const adminClient = createAdminClient()

  const { data: lead, error } = await adminClient
    .from('leads')
    .select('firmenname, ansprechpartner, email')
    .eq('id', leadId)
    .single()
  if (error) throw new DomainError('Lead nicht gefunden.')

  const anrede = lead.ansprechpartner ? `Hallo ${lead.ansprechpartner.split(' ')[0]}` : `Hallo`
  const subject = `Kurzes Follow-Up${anlass ? ` – ${anlass}` : ''} – Schuck Webdesign`
  const body = `${anrede},

ich wollte kurz nachfragen, ob Sie schon Gelegenheit hatten, sich mit unserem Gespräch${anlass ? ` (${anlass})` : ''} zu befassen.

Gerne stehe ich für offene Fragen zur Verfügung oder wir vereinbaren einen kurzen Termin.

Beste Grüße
Eric Schuck
Schuck Webdesign`

  return {
    lead_id: leadId,
    to: lead.email,
    subject,
    body,
    note: 'Nur Entwurf — es wurde keine E-Mail versendet.',
  }
}

// ── send_followup_email ───────────────────────────────────────────────────

export async function sendFollowupEmail(leadId: string, anlass?: string | null) {
  const draft = await draftFollowupEmail(leadId, anlass)
  if (!draft.to) throw new DomainError('Für diesen Lead ist keine E-Mail-Adresse hinterlegt.')

  const result = await sendEmail({ to: draft.to, subject: draft.subject, html: draft.body.replace(/\n/g, '<br>') })
  if (!result.sent) throw new DomainError(`E-Mail konnte nicht gesendet werden: ${result.error}`)

  const adminClient = createAdminClient()
  const { data: existing } = await adminClient.from('leads').select('notizen').eq('id', leadId).single()
  const dated = `[${new Date().toLocaleDateString('de-DE')}] Follow-Up-E-Mail gesendet: "${draft.subject}"`
  const notizen = existing?.notizen ? `${existing.notizen}\n${dated}` : dated
  await adminClient.from('leads').update({ notizen }).eq('id', leadId)

  return { lead_id: leadId, to: draft.to, subject: draft.subject, sent: true as const }
}

// ── set_wiedervorlage ─────────────────────────────────────────────────────────

export async function setWiedervorlage(leadId: string, wiedervorlage: string, notiz?: string | null) {
  const adminClient = createAdminClient()

  const { data: lead, error: leadError } = await adminClient
    .from('leads')
    .update({ wiedervorlage, akquise_ergebnis: 'wiedervorlage' })
    .eq('id', leadId)
    .select('*')
    .single()
  if (leadError) throw new DomainError(leadError.message)

  const { data: todo, error: todoError } = await adminClient
    .from('todos')
    .insert({
      title: `Wiedervorlage: ${lead.firmenname}${notiz ? ` – ${notiz}` : ''}`,
      due_date: wiedervorlage,
      priority: lead.prioritaet === 'high' ? 'high' : lead.prioritaet === 'low' ? 'low' : 'medium',
    })
    .select('*')
    .single()
  if (todoError) throw new DomainError(`Wiedervorlage gesetzt, aber Todo konnte nicht angelegt werden: ${todoError.message}`)

  return { lead, todo }
}

// ── log_akquise_tracking ──────────────────────────────────────────────────────

export interface LogAkquiseTrackingInput {
  datum?: string
  waehlversuche?: number
  gespraecheEmpfang?: number
  gespraecheEntscheider?: number
  termineVereinbart?: number
}

export async function logAkquiseTracking(input: LogAkquiseTrackingInput) {
  const datum = input.datum ?? new Date().toISOString().slice(0, 10)
  const adminClient = createAdminClient()

  const { data: existing } = await adminClient.from('akquise_tracking').select('*').eq('datum', datum).single()

  const deltas = {
    waehlversuche: input.waehlversuche ?? 0,
    gespraeche_empfang: input.gespraecheEmpfang ?? 0,
    gespraeche_entscheider: input.gespraecheEntscheider ?? 0,
    termine_vereinbart: input.termineVereinbart ?? 0,
  }

  if (existing) {
    const { data, error } = await adminClient
      .from('akquise_tracking')
      .update({
        waehlversuche: existing.waehlversuche + deltas.waehlversuche,
        gespraeche_empfang: existing.gespraeche_empfang + deltas.gespraeche_empfang,
        gespraeche_entscheider: existing.gespraeche_entscheider + deltas.gespraeche_entscheider,
        termine_vereinbart: existing.termine_vereinbart + deltas.termine_vereinbart,
      })
      .eq('datum', datum)
      .select('*')
      .single()
    if (error) throw new DomainError(error.message)
    return data
  }

  const { data, error } = await adminClient
    .from('akquise_tracking')
    .insert({ datum, ...deltas })
    .select('*')
    .single()
  if (error) throw new DomainError(error.message)
  return data
}

export interface ListAkquiseTrackingFilter {
  fromDate?: string
  toDate?: string
}

export async function listAkquiseTracking(filter: ListAkquiseTrackingFilter = {}) {
  const adminClient = createAdminClient()
  let query = adminClient.from('akquise_tracking').select('*').order('datum', { ascending: false })

  if (filter.fromDate) query = query.gte('datum', filter.fromDate)
  if (filter.toDate) query = query.lte('datum', filter.toDate)

  const { data, error } = await query
  if (error) throw new DomainError(error.message)
  return data
}

// ── get_funnel_stats ──────────────────────────────────────────────────────────

export async function getFunnelStats() {
  const adminClient = createAdminClient()

  const [{ data: leads, error: leadsError }, { data: qualiRows, error: qualiError }, { data: salesRows, error: salesError }] =
    await Promise.all([
      adminClient.from('leads').select('id, current_stage'),
      adminClient.from('quali_calls').select('lead_id'),
      adminClient.from('sales_calls').select('lead_id'),
    ])

  if (leadsError) throw new DomainError(leadsError.message)
  if (qualiError) throw new DomainError(qualiError.message)
  if (salesError) throw new DomainError(salesError.message)

  const totalLeads = leads?.length ?? 0
  const byStage: Record<string, number> = {}
  for (const l of leads ?? []) {
    byStage[l.current_stage] = (byStage[l.current_stage] ?? 0) + 1
  }

  const reachedQualiCall = new Set((qualiRows ?? []).map((r) => r.lead_id)).size
  const reachedClosingCall = new Set((salesRows ?? []).map((r) => r.lead_id)).size
  const gewonnen = byStage['gewonnen'] ?? 0

  const rate = (numerator: number, denominator: number) =>
    denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null

  return {
    total_leads: totalLeads,
    by_stage: byStage,
    reached_quali_call: reachedQualiCall,
    reached_closing_call: reachedClosingCall,
    gewonnen,
    conversion_rates_percent: {
      erstkontakt_zu_quali_call: rate(reachedQualiCall, totalLeads),
      quali_call_zu_closing_call: rate(reachedClosingCall, reachedQualiCall),
      closing_call_zu_gewonnen: rate(gewonnen, reachedClosingCall),
      gesamt_erstkontakt_zu_gewonnen: rate(gewonnen, totalLeads),
    },
  }
}
