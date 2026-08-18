import { createAdminClient } from '@/lib/supabase/admin'
import { DomainError } from './errors'
import { generateInvoicePdf } from '@/lib/pdf/invoice'
import { fmtEuro, OVERDUE_DAYS } from '@/lib/pdf/shared'
import { sendEmail } from '@/lib/email/send'
import { clientDisplayName } from '@/lib/client-name'
import type { CompanySettings, CreditNote, Database, Invoice, InvoiceStatus } from '@/types/database'

type SupabaseAdminClient = ReturnType<typeof createAdminClient>
type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']
type CompanySettingsUpdate = Database['public']['Tables']['company_settings']['Update']

export const INVOICE_STATUS_VALUES: InvoiceStatus[] = ['entwurf', 'versendet', 'bezahlt', 'storniert']

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ── company_settings ──────────────────────────────────────────────────────

/** Legt beim allerersten Aufruf die (einzige) Zeile mit Default-Werten an. */
export async function getCompanySettings(): Promise<CompanySettings> {
  const adminClient = createAdminClient()
  const { data: existing, error } = await adminClient.from('company_settings').select('*').limit(1).maybeSingle()
  if (error) throw new DomainError(error.message)
  if (existing) return existing

  const { data: created, error: createError } = await adminClient
    .from('company_settings')
    .insert({})
    .select('*')
    .single()
  if (createError) throw new DomainError(createError.message)
  return created
}

export interface UpdateCompanySettingsInput {
  companyName?: string
  inhaber?: string | null
  addressStreet?: string | null
  addressZip?: string | null
  addressCity?: string | null
  addressCountry?: string
  email?: string | null
  phone?: string | null
  website?: string | null
  iban?: string | null
  bic?: string | null
  bankName?: string | null
  steuernummer?: string | null
  ustId?: string | null
  ustPflichtig?: boolean
}

export async function updateCompanySettings(patch: UpdateCompanySettingsInput): Promise<CompanySettings> {
  const settings = await getCompanySettings()

  const updates: Record<string, unknown> = {}
  if (patch.companyName !== undefined) updates.company_name = patch.companyName
  if (patch.inhaber !== undefined) updates.inhaber = patch.inhaber
  if (patch.addressStreet !== undefined) updates.address_street = patch.addressStreet
  if (patch.addressZip !== undefined) updates.address_zip = patch.addressZip
  if (patch.addressCity !== undefined) updates.address_city = patch.addressCity
  if (patch.addressCountry !== undefined) updates.address_country = patch.addressCountry
  if (patch.email !== undefined) updates.email = patch.email
  if (patch.phone !== undefined) updates.phone = patch.phone
  if (patch.website !== undefined) updates.website = patch.website
  if (patch.iban !== undefined) updates.iban = patch.iban
  if (patch.bic !== undefined) updates.bic = patch.bic
  if (patch.bankName !== undefined) updates.bank_name = patch.bankName
  if (patch.steuernummer !== undefined) updates.steuernummer = patch.steuernummer
  if (patch.ustId !== undefined) updates.ust_id = patch.ustId
  if (patch.ustPflichtig !== undefined) updates.ust_pflichtig = patch.ustPflichtig

  if (Object.keys(updates).length === 0) throw new DomainError('Keine Felder zum Aktualisieren angegeben.')

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('company_settings')
    .update(updates as CompanySettingsUpdate)
    .eq('id', settings.id)
    .select('*')
    .single()
  if (error) throw new DomainError(error.message)
  return data
}

// ── Positions-Auflösung (gemeinsam für Entwurf anlegen/bearbeiten) ───────────

export interface InvoiceItemInput {
  artNr?: string
  pktNr?: string
  bezeichnung?: string
  menge?: number
  ep: number
}

export interface ResolvedInvoiceItem {
  art_nr: string | null
  pos: number
  bezeichnung: string
  menge: number
  ep: number
  gesamt: number
}

async function resolveInvoiceItems(
  adminClient: SupabaseAdminClient,
  items: InvoiceItemInput[]
): Promise<ResolvedInvoiceItem[]> {
  if (!items || items.length === 0) {
    throw new DomainError('items ist erforderlich und muss mindestens eine Position mit ep enthalten.')
  }

  const resolved: ResolvedInvoiceItem[] = []

  for (const [index, item] of items.entries()) {
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

    resolved.push({
      art_nr: artNr,
      pos: index + 1,
      bezeichnung,
      menge,
      ep: item.ep,
      gesamt: round2(menge * item.ep),
    })
  }

  return resolved
}

// ── invoices: list/get ────────────────────────────────────────────────────

export interface ListInvoicesFilter {
  status?: InvoiceStatus
  clientId?: string
  fromDate?: string
  toDate?: string
  /** Default: Testrechnungen (is_test=true) sind ausgeblendet. */
  includeTest?: boolean
}

export async function listInvoices(filter: ListInvoicesFilter = {}) {
  const adminClient = createAdminClient()
  let query = adminClient
    .from('invoices')
    .select(
      'id, invoice_number, client_id, project_id, status, invoice_date, service_date, total_net, sent_at, paid_at, created_at, is_test, is_backfilled, clients(company_name, contact_name, profiles(full_name))'
    )
    .order('created_at', { ascending: false })

  if (filter.status) query = query.eq('status', filter.status)
  if (filter.clientId) query = query.eq('client_id', filter.clientId)
  if (filter.fromDate) query = query.gte('invoice_date', filter.fromDate)
  if (filter.toDate) query = query.lte('invoice_date', filter.toDate)
  if (!filter.includeTest) query = query.eq('is_test', false)

  const { data, error } = await query
  if (error) throw new DomainError(error.message)

  return (data ?? []).map(({ clients, ...invoice }) => {
    const client = Array.isArray(clients) ? clients[0] : clients
    const profile = client ? (Array.isArray(client.profiles) ? client.profiles[0] : client.profiles) : null
    return {
      ...invoice,
      client_display_name: clientDisplayName(profile?.full_name, client?.contact_name, client?.company_name),
    }
  })
}

export async function getInvoice(invoiceId: string) {
  const adminClient = createAdminClient()

  const [{ data: invoice, error: invoiceError }, { data: items, error: itemsError }, { data: creditNotes, error: creditNotesError }] =
    await Promise.all([
      adminClient
        .from('invoices')
        .select(
          '*, clients(company_name, contact_name, contact_email, client_number, address_street, address_zip, address_city, address_country, profiles(email, full_name)), projects(project_number, title)'
        )
        .eq('id', invoiceId)
        .single(),
      adminClient.from('invoice_items').select('*').eq('invoice_id', invoiceId).order('pos', { ascending: true }),
      adminClient.from('credit_notes').select('*').eq('invoice_id', invoiceId).order('created_at', { ascending: false }),
    ])

  if (invoiceError) throw new DomainError('Rechnung nicht gefunden.')
  if (itemsError) throw new DomainError(itemsError.message)
  if (creditNotesError) throw new DomainError(creditNotesError.message)

  const { clients, projects, ...rest } = invoice
  const client = Array.isArray(clients) ? clients[0] : clients
  const project = Array.isArray(projects) ? projects[0] : projects

  return { ...rest, client, project, items: items ?? [], credit_notes: creditNotes ?? [] }
}

export type InvoiceDetail = Awaited<ReturnType<typeof getInvoice>>

// ── invoices: Entwurf anlegen/bearbeiten ─────────────────────────────────────

export interface CreateInvoiceDraftInput {
  clientId: string
  projectId?: string | null
  serviceDate?: string | null
  recurringSource?: string | null
  /** Testrechnung: eigener Nummernkreis (TEST-JJJJ-NNN) beim Stellen, aus Umsatzstatistik/Liste
   * ausgeblendet, frei löschbar (siehe issueInvoice()/deleteTestInvoice() unten). */
  isTest?: boolean
  items: InvoiceItemInput[]
}

export async function createInvoiceDraft(input: CreateInvoiceDraftInput) {
  if (!input.clientId) throw new DomainError('client_id ist erforderlich.')

  const adminClient = createAdminClient()

  const { error: clientError } = await adminClient.from('clients').select('id').eq('id', input.clientId).single()
  if (clientError) throw new DomainError('Kunde nicht gefunden.')

  const resolvedItems = await resolveInvoiceItems(adminClient, input.items)
  const totalNet = round2(resolvedItems.reduce((sum, i) => sum + i.gesamt, 0))
  const companySettings = await getCompanySettings()

  const { data: invoice, error: invoiceError } = await adminClient
    .from('invoices')
    .insert({
      client_id: input.clientId,
      project_id: input.projectId ?? null,
      status: 'entwurf',
      service_date: input.serviceDate ?? null,
      ust_pflichtig: companySettings.ust_pflichtig,
      total_net: totalNet,
      recurring_source: input.recurringSource ?? null,
      is_test: input.isTest ?? false,
    })
    .select('*')
    .single()

  if (invoiceError) throw new DomainError(`Rechnungsentwurf konnte nicht gespeichert werden: ${invoiceError.message}`)

  const { error: itemsError } = await adminClient
    .from('invoice_items')
    .insert(resolvedItems.map((i) => ({ ...i, invoice_id: invoice.id })))
  if (itemsError) {
    throw new DomainError(`Entwurf angelegt, aber Positionen konnten nicht gespeichert werden: ${itemsError.message}`)
  }

  return { ...invoice, items: resolvedItems }
}

export interface UpdateInvoiceDraftInput {
  clientId?: string
  projectId?: string | null
  serviceDate?: string | null
  ustPflichtig?: boolean
  recurringSource?: string | null
  items?: InvoiceItemInput[]
}

/** Nur Entwürfe sind editierbar — gestellte Rechnungen blockt bereits der DB-Trigger. */
export async function updateInvoiceDraft(invoiceId: string, patch: UpdateInvoiceDraftInput) {
  const adminClient = createAdminClient()

  const { data: existing, error: existingError } = await adminClient
    .from('invoices')
    .select('status')
    .eq('id', invoiceId)
    .single()
  if (existingError) throw new DomainError('Rechnung nicht gefunden.')
  if (existing.status !== 'entwurf') {
    throw new DomainError('Nur Entwürfe können bearbeitet werden — gestellte Rechnungen sind unveränderlich (GoBD).')
  }

  const updates: Record<string, unknown> = {}
  if (patch.clientId !== undefined) updates.client_id = patch.clientId
  if (patch.projectId !== undefined) updates.project_id = patch.projectId
  if (patch.serviceDate !== undefined) updates.service_date = patch.serviceDate
  if (patch.ustPflichtig !== undefined) updates.ust_pflichtig = patch.ustPflichtig
  if (patch.recurringSource !== undefined) updates.recurring_source = patch.recurringSource

  let resolvedItems: ResolvedInvoiceItem[] | null = null
  if (patch.items) {
    resolvedItems = await resolveInvoiceItems(adminClient, patch.items)
    updates.total_net = round2(resolvedItems.reduce((sum, i) => sum + i.gesamt, 0))
  }

  if (Object.keys(updates).length === 0) {
    throw new DomainError('Keine Änderungen übergeben.')
  }

  const { error: updateError } = await adminClient.from('invoices').update(updates as InvoiceUpdate).eq('id', invoiceId)
  if (updateError) throw new DomainError(updateError.message)

  if (resolvedItems) {
    const { error: deleteError } = await adminClient.from('invoice_items').delete().eq('invoice_id', invoiceId)
    if (deleteError) throw new DomainError(`Positionen konnten nicht aktualisiert werden: ${deleteError.message}`)

    const { error: insertError } = await adminClient
      .from('invoice_items')
      .insert(resolvedItems.map((i) => ({ ...i, invoice_id: invoiceId })))
    if (insertError) throw new DomainError(`Positionen konnten nicht gespeichert werden: ${insertError.message}`)
  }

  return getInvoice(invoiceId)
}

// ── invoices: PDF-Erzeugung (gemeinsam für Stellen/Nachtragen/Neu-Erzeugen) ──

async function buildInvoicePdfBytes(invoice: InvoiceDetail, companySettings: CompanySettings): Promise<Uint8Array> {
  if (!invoice.client) throw new DomainError('Kunde der Rechnung konnte nicht geladen werden.')
  if (!invoice.invoice_number || !invoice.invoice_date) {
    throw new DomainError('Rechnung hat keine Nummer/kein Datum — PDF kann nicht erzeugt werden.')
  }

  const invoiceClientProfile = Array.isArray(invoice.client.profiles) ? invoice.client.profiles[0] : invoice.client.profiles

  return generateInvoicePdf({
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date,
    serviceDate: invoice.service_date,
    ustPflichtig: invoice.ust_pflichtig,
    totalNet: invoice.total_net,
    items: invoice.items,
    client: { ...invoice.client, full_name: invoiceClientProfile?.full_name ?? null },
    companySettings,
    projectTitle: invoice.project?.title ?? null,
  })
}

/** Erzeugt das PDF einer bereits gestellten Rechnung (Nummer + Datum vorhanden) und lädt es
 * in den privaten Bucket 'invoices' hoch — Basis für issueInvoice(), regenerateInvoicePdf()
 * und createBackfilledInvoice(). */
async function generateAndStoreInvoicePdf(invoiceId: string, invoice: InvoiceDetail): Promise<Invoice> {
  const adminClient = createAdminClient()
  const companySettings = await getCompanySettings()
  const pdfBytes = await buildInvoicePdfBytes(invoice, companySettings)

  const path = `${invoice.client_id}/${invoice.invoice_number}.pdf`
  const { error: uploadError } = await adminClient.storage
    .from('invoices')
    .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true })
  if (uploadError) {
    throw new DomainError(`PDF konnte nicht gespeichert werden: ${uploadError.message}`)
  }

  const { data: updated, error: updateError } = await adminClient
    .from('invoices')
    .update({ pdf_url: path })
    .eq('id', invoiceId)
    .select('*')
    .single()
  if (updateError) {
    throw new DomainError(`PDF gespeichert, aber pdf_url konnte nicht aktualisiert werden: ${updateError.message}`)
  }
  return updated
}

/** Erzeugt eine Vorschau-PDF für einen Entwurf, OHNE etwas zu speichern (keine Nummer, kein
 * Upload) — Rechnungsnummer/-datum werden nur als Platzhalter fürs Layout eingesetzt. */
export async function previewInvoicePdf(invoiceId: string): Promise<Uint8Array> {
  const invoice = await getInvoice(invoiceId)
  if (invoice.status !== 'entwurf') {
    throw new DomainError('Eine Vorschau ist nur für Entwürfe möglich — gestellte Rechnungen haben bereits ein PDF.')
  }
  const companySettings = await getCompanySettings()
  return buildInvoicePdfBytes(
    { ...invoice, invoice_number: 'VORSCHAU', invoice_date: invoice.invoice_date ?? new Date().toISOString().slice(0, 10) },
    companySettings
  )
}

/** Erzeugt das PDF einer bereits gestellten Rechnung erneut (z.B. nach Layout-Änderungen oder
 * wenn das ursprüngliche PDF verloren ging) — Nummer/Daten der Rechnung bleiben unverändert. */
export async function regenerateInvoicePdf(invoiceId: string): Promise<InvoiceDetail> {
  const invoice = await getInvoice(invoiceId)
  if (invoice.status === 'entwurf') {
    throw new DomainError('Entwürfe haben noch kein PDF — erst stellen.')
  }
  const updated = await generateAndStoreInvoicePdf(invoiceId, invoice)
  return { ...invoice, ...updated }
}

// ── invoices: stellen (Nummer + PDF) ─────────────────────────────────────────

/**
 * Stellt eine Rechnung: zieht die RE-Nummer über die atomare Postgres-Funktion
 * `issue_invoice` (Nummer + Statuswechsel in einer Transaktion, GoBD-konform) —
 * bzw. bei Testrechnungen (is_test) eine TEST-Nummer über den eigenen, nicht
 * GoBD-relevanten Nummernkreis — und erzeugt danach das PDF im privaten Bucket.
 *
 * Schlägt die PDF-Erzeugung/der Upload fehl, ist die Nummer bereits sicher
 * vergeben (die Transaktion ist committed) — ein erneuter Aufruf dieser
 * Funktion auf dieselbe Rechnung wiederholt NUR den PDF-Schritt, es wird
 * keine neue Nummer gezogen ("kein Verbrennen" von Nummern).
 */
export async function issueInvoice(invoiceId: string): Promise<InvoiceDetail> {
  const adminClient = createAdminClient()

  let invoice = await getInvoice(invoiceId)

  if (invoice.status === 'entwurf') {
    if (invoice.is_test) {
      const year = String(new Date().getFullYear())
      const { data: seq, error: seqError } = await adminClient.rpc('get_next_number', { p_typ: 'TEST', p_scope: year })
      if (seqError) throw new DomainError(seqError.message)
      const invoiceNumber = `TEST-${year}-${String(seq).padStart(3, '0')}`
      const { data: issued, error } = await adminClient
        .from('invoices')
        .update({ invoice_number: invoiceNumber, invoice_date: new Date().toISOString().slice(0, 10), status: 'versendet' })
        .eq('id', invoiceId)
        .select('*')
        .single()
      if (error) throw new DomainError(error.message)
      invoice = { ...invoice, ...(issued as Invoice) }
    } else {
      const { data: issued, error } = await adminClient.rpc('issue_invoice', { p_id: invoiceId })
      if (error) throw new DomainError(error.message)
      invoice = { ...invoice, ...(issued as Invoice) }
    }
  } else if (invoice.pdf_url) {
    throw new DomainError(`Rechnung ${invoice.invoice_number} wurde bereits gestellt.`)
  }
  // status != 'entwurf' und pdf_url == null: vorheriger PDF-Versuch ist fehlgeschlagen —
  // Retry unten, OHNE erneut issue_invoice() aufzurufen (keine neue Nummer).

  const updated = await generateAndStoreInvoicePdf(invoiceId, invoice)
  return { ...invoice, ...updated }
}

// ── invoices: Nachtragen bereits (außerhalb dieses Systems) ausgestellter Rechnungen ──

export interface CreateBackfilledInvoiceInput {
  clientId: string
  projectId?: string | null
  /** Ursprüngliche, bereits vergebene Rechnungsnummer — wird 1:1 übernommen, keine neue Nummer
   * wird gezogen. Muss eindeutig sein (DB-Constraint prüft das ohnehin). */
  invoiceNumber: string
  invoiceDate: string
  serviceDate?: string | null
  status: 'versendet' | 'bezahlt'
  /** Nur bei status='bezahlt' relevant; Default: invoiceDate. */
  paidAt?: string | null
  ustPflichtig?: boolean
  items: InvoiceItemInput[]
  /** Original-PDF der Rechnung (z.B. aus Word/einem Vorsystem) — wird 1:1 als pdf_url abgelegt.
   * Hat Vorrang vor generatePdf, wenn beides angegeben wird. */
  uploadedPdf?: { bytes: Uint8Array; contentType: string } | null
  /** Nur relevant, wenn kein uploadedPdf angegeben ist: erzeugt stattdessen ein PDF nach dem
   * Layout dieses Systems (entspricht dann nicht zwingend dem Original). Default: false. */
  generatePdf?: boolean
}

/**
 * Trägt eine Rechnung nach, die bereits außerhalb dieses Systems gestellt wurde (z.B. vor
 * Einführung dieser Software) — mit ihrer ursprünglichen Nummer statt einer neu gezogenen.
 *
 * Ablauf bewusst wie ein manuelles issue_invoice(): Header zunächst als 'entwurf' anlegen
 * (Positionen sind nur für Entwürfe einfügbar, siehe enforce_invoice_items_immutability()),
 * dann in einem einzigen UPDATE auf den Zielstatus samt manueller Nummer heben — laut
 * enforce_invoice_immutability() ist das erlaubt, solange old.status noch 'entwurf' ist.
 * Ab diesem UPDATE ist die Rechnung eine ganz normale, GoBD-unveränderliche Rechnung.
 */
export async function createBackfilledInvoice(input: CreateBackfilledInvoiceInput): Promise<InvoiceDetail> {
  if (!input.clientId) throw new DomainError('client_id ist erforderlich.')
  if (!input.invoiceNumber?.trim()) throw new DomainError('Die ursprüngliche Rechnungsnummer ist erforderlich.')
  if (!input.invoiceDate) throw new DomainError('Rechnungsdatum ist erforderlich.')

  const adminClient = createAdminClient()

  const { error: clientError } = await adminClient.from('clients').select('id').eq('id', input.clientId).single()
  if (clientError) throw new DomainError('Kunde nicht gefunden.')

  const { data: duplicate } = await adminClient
    .from('invoices')
    .select('id')
    .eq('invoice_number', input.invoiceNumber.trim())
    .maybeSingle()
  if (duplicate) throw new DomainError(`Rechnungsnummer ${input.invoiceNumber} existiert bereits.`)

  const resolvedItems = await resolveInvoiceItems(adminClient, input.items)
  const totalNet = round2(resolvedItems.reduce((sum, i) => sum + i.gesamt, 0))
  const companySettings = await getCompanySettings()

  const { data: draft, error: draftError } = await adminClient
    .from('invoices')
    .insert({
      client_id: input.clientId,
      project_id: input.projectId ?? null,
      status: 'entwurf',
      service_date: input.serviceDate ?? null,
      ust_pflichtig: input.ustPflichtig ?? companySettings.ust_pflichtig,
      total_net: totalNet,
      is_backfilled: true,
    })
    .select('*')
    .single()
  if (draftError) throw new DomainError(`Rechnung konnte nicht angelegt werden: ${draftError.message}`)

  const { error: itemsError } = await adminClient
    .from('invoice_items')
    .insert(resolvedItems.map((i) => ({ ...i, invoice_id: draft.id })))
  if (itemsError) {
    await adminClient.from('invoices').delete().eq('id', draft.id)
    throw new DomainError(`Positionen konnten nicht gespeichert werden: ${itemsError.message}`)
  }

  const { data: issued, error: issueError } = await adminClient
    .from('invoices')
    .update({
      invoice_number: input.invoiceNumber.trim(),
      invoice_date: input.invoiceDate,
      status: input.status,
      sent_at: input.invoiceDate,
      paid_at: input.status === 'bezahlt' ? input.paidAt ?? input.invoiceDate : null,
    })
    .eq('id', draft.id)
    .select('*')
    .single()
  if (issueError) throw new DomainError(`Rechnung angelegt, aber Nummer konnte nicht gesetzt werden: ${issueError.message}`)

  let result = await getInvoice(draft.id)
  result = { ...result, ...(issued as Invoice) }

  if (input.uploadedPdf) {
    const path = `${input.clientId}/${input.invoiceNumber.trim()}.pdf`
    const { error: uploadError } = await adminClient.storage
      .from('invoices')
      .upload(path, input.uploadedPdf.bytes, { contentType: input.uploadedPdf.contentType, upsert: true })
    if (uploadError) throw new DomainError(`Rechnung angelegt, aber PDF konnte nicht hochgeladen werden: ${uploadError.message}`)

    const { data: withPdf, error: pdfUrlError } = await adminClient
      .from('invoices')
      .update({ pdf_url: path })
      .eq('id', draft.id)
      .select('*')
      .single()
    if (pdfUrlError) throw new DomainError(`PDF hochgeladen, aber pdf_url konnte nicht gesetzt werden: ${pdfUrlError.message}`)
    result = { ...result, ...withPdf }
  } else if (input.generatePdf) {
    const updated = await generateAndStoreInvoicePdf(draft.id, result)
    result = { ...result, ...updated }
  }

  return result
}

// ── invoices: Testrechnungen löschen ─────────────────────────────────────────

/** Testrechnungen sind nicht GoBD-unveränderlich (siehe enforce_invoice_immutability()) und
 * dürfen daher, anders als echte Rechnungen, wieder gelöscht werden. */
export async function deleteTestInvoice(invoiceId: string): Promise<void> {
  const adminClient = createAdminClient()

  const { data: existing, error: existingError } = await adminClient
    .from('invoices')
    .select('is_test')
    .eq('id', invoiceId)
    .single()
  if (existingError) throw new DomainError('Rechnung nicht gefunden.')
  if (!existing.is_test) throw new DomainError('Nur Testrechnungen können hier gelöscht werden.')

  const { error } = await adminClient.from('invoices').delete().eq('id', invoiceId)
  if (error) throw new DomainError(error.message)
}

export async function getInvoicePdfUrl(pdfPath: string): Promise<string | null> {
  const adminClient = createAdminClient()
  const { data } = await adminClient.storage.from('invoices').createSignedUrl(pdfPath, 3600)
  return data?.signedUrl ?? null
}

// ── invoices: senden ──────────────────────────────────────────────────────

/**
 * Verschickt das PDF einer bereits gestellten Rechnung per E-Mail und setzt
 * `sent_at`. Diese Spalte darf laut DB-Trigger (enforce_invoice_immutability)
 * genau einmal von NULL auf einen Zeitstempel wechseln — ein erneuter Versand
 * derselben Rechnung schlägt daher bewusst fehl, statt den Zeitstempel zu
 * überschreiben.
 */
export async function sendInvoice(invoiceId: string, to?: string): Promise<Invoice> {
  const invoice = await getInvoice(invoiceId)
  if (!invoice.pdf_url) throw new DomainError('Rechnung wurde noch nicht gestellt (kein PDF vorhanden).')
  if (invoice.sent_at) throw new DomainError(`Rechnung ${invoice.invoice_number} wurde bereits am ${invoice.sent_at} versendet.`)

  const profile = invoice.client ? (Array.isArray(invoice.client.profiles) ? invoice.client.profiles[0] : invoice.client.profiles) : null
  const recipient = to ?? profile?.email ?? invoice.client?.contact_email ?? null
  if (!recipient) throw new DomainError('Keine Empfänger-E-Mail-Adresse angegeben oder für den Kunden hinterlegt.')

  const adminClient = createAdminClient()
  const { data: pdfBlob, error: downloadError } = await adminClient.storage.from('invoices').download(invoice.pdf_url)
  if (downloadError) throw new DomainError(`PDF konnte nicht geladen werden: ${downloadError.message}`)

  const result = await sendEmail({
    to: recipient,
    subject: `Rechnung ${invoice.invoice_number}`,
    html: `Sehr geehrte Damen und Herren,<br><br>anbei erhalten Sie die Rechnung ${invoice.invoice_number} über ${fmtEuro(invoice.total_net)}.<br><br>Beste Grüße<br>Schuck Webdesign`,
    attachment: { filename: `${invoice.invoice_number}.pdf`, content: new Uint8Array(await pdfBlob.arrayBuffer()) },
  })
  if (!result.sent) throw new DomainError(`Rechnung konnte nicht gesendet werden: ${result.error}`)

  const { data: updated, error: updateError } = await adminClient
    .from('invoices')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .select('*')
    .single()
  if (updateError) throw new DomainError(updateError.message)

  return updated
}

// ── invoices: Zahlungserinnerung ─────────────────────────────────────────

export interface SendPaymentReminderResult {
  sent: true
  to: string
  /** Tage seit Ablauf der Zahlungsfrist (OVERDUE_DAYS) — 0 oder negativ heißt: noch nicht fällig. */
  overdueDays: number | null
}

/**
 * Verschickt eine Zahlungserinnerung (Mahnung) für eine bereits gestellte, noch offene
 * Rechnung — hängt das Rechnungs-PDF erneut an. Im Gegensatz zu sendInvoice() setzt das
 * hier keinen unveränderlichen Zeitstempel — ein mehrfacher Versand (1., 2. Mahnung) ist
 * bewusst erlaubt.
 */
export async function sendPaymentReminder(invoiceId: string, to?: string): Promise<SendPaymentReminderResult> {
  const invoice = await getInvoice(invoiceId)
  if (invoice.status !== 'versendet') {
    throw new DomainError(`Zahlungserinnerung nur für offene (versendete) Rechnungen möglich — aktueller Status: "${invoice.status}".`)
  }
  if (!invoice.pdf_url) throw new DomainError('Rechnung hat kein PDF (noch nicht gestellt?).')

  const profile = invoice.client ? (Array.isArray(invoice.client.profiles) ? invoice.client.profiles[0] : invoice.client.profiles) : null
  const recipient = to ?? profile?.email ?? invoice.client?.contact_email ?? null
  if (!recipient) throw new DomainError('Keine Empfänger-E-Mail-Adresse angegeben oder für den Kunden hinterlegt.')

  const overdueDays = invoice.invoice_date
    ? Math.floor((Date.now() - new Date(invoice.invoice_date).getTime()) / (24 * 60 * 60 * 1000)) - OVERDUE_DAYS
    : null

  const adminClient = createAdminClient()
  const { data: pdfBlob, error: downloadError } = await adminClient.storage.from('invoices').download(invoice.pdf_url)
  if (downloadError) throw new DomainError(`PDF konnte nicht geladen werden: ${downloadError.message}`)

  const betreff = overdueDays != null && overdueDays > 0 ? `Zahlungserinnerung: Rechnung ${invoice.invoice_number}` : `Erinnerung: Rechnung ${invoice.invoice_number}`
  const ueberfaelligZeile =
    overdueDays != null && overdueDays > 0
      ? `Die Zahlungsfrist ist seit ${overdueDays} ${overdueDays === 1 ? 'Tag' : 'Tagen'} abgelaufen. `
      : ''

  const result = await sendEmail({
    to: recipient,
    subject: betreff,
    html:
      `Sehr geehrte Damen und Herren,<br><br>` +
      `wir möchten Sie freundlich an die noch offene Rechnung ${invoice.invoice_number} über ${fmtEuro(invoice.total_net)} erinnern. ` +
      `${ueberfaelligZeile}Die Rechnung finden Sie noch einmal im Anhang.<br><br>` +
      `Bitte gleichen Sie den Betrag zeitnah aus — bei bereits erfolgter Zahlung betrachten Sie diese Erinnerung als erledigt.<br><br>` +
      `Beste Grüße<br>Schuck Webdesign`,
    attachment: { filename: `${invoice.invoice_number}.pdf`, content: new Uint8Array(await pdfBlob.arrayBuffer()) },
  })
  if (!result.sent) throw new DomainError(`Zahlungserinnerung konnte nicht gesendet werden: ${result.error}`)

  return { sent: true, to: recipient, overdueDays }
}

// ── invoices: Statuswechsel ───────────────────────────────────────────────

export async function updateInvoiceStatus(invoiceId: string, status: 'bezahlt' | 'storniert'): Promise<Invoice> {
  const adminClient = createAdminClient()

  const { data: existing, error: existingError } = await adminClient
    .from('invoices')
    .select('status')
    .eq('id', invoiceId)
    .single()
  if (existingError) throw new DomainError('Rechnung nicht gefunden.')
  if (existing.status !== 'versendet') {
    throw new DomainError(`Statuswechsel auf "${status}" ist nur von "versendet" aus möglich (aktuell: "${existing.status}").`)
  }

  const updates: Record<string, unknown> = { status }
  if (status === 'bezahlt') updates.paid_at = new Date().toISOString()

  const { data, error } = await adminClient
    .from('invoices')
    .update(updates as InvoiceUpdate)
    .eq('id', invoiceId)
    .select('*')
    .single()
  if (error) throw new DomainError(error.message)
  return data
}

// ── credit_notes ──────────────────────────────────────────────────────────

export interface CreateCreditNoteInput {
  invoiceId: string
  reason?: string | null
  totalNet: number
}

/** Zieht die GS-Nummer atomar über die Postgres-Funktion `create_credit_note` — dieselbe Garantie wie bei RE-Nummern. */
export async function createCreditNote(input: CreateCreditNoteInput): Promise<CreditNote> {
  if (!input.totalNet || input.totalNet <= 0) throw new DomainError('total_net muss größer als 0 sein.')

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.rpc('create_credit_note', {
    p_invoice_id: input.invoiceId,
    p_reason: input.reason ?? null,
    p_total_net: input.totalNet,
  })
  if (error) throw new DomainError(error.message)
  return data as CreditNote
}

// ── Umsatzübersicht ───────────────────────────────────────────────────────

export interface RevenueOverviewFilter {
  /** Default: 1. Januar des laufenden Jahres. */
  fromDate?: string
  /** Default: heute. */
  toDate?: string
}

export interface RevenueOverview {
  total_net: number
  revenue_this_month: number
  revenue_this_year: number
  open_amount: number
  overdue_amount: number
  by_month: { month: string; total_net: number }[]
  by_client: { client_id: string; display_name: string; total_net: number }[]
  by_category: { kategorie: string; total_net: number }[]
  /** Offene (versendete) Rechnungen, älteste zuerst — für die Dashboard-Übersicht. */
  open_invoices: {
    id: string
    invoice_number: string | null
    display_name: string
    invoice_date: string | null
    total_net: number
    is_overdue: boolean
  }[]
}

export async function getRevenueOverview(filter: RevenueOverviewFilter = {}): Promise<RevenueOverview> {
  const adminClient = createAdminClient()

  const now = new Date()
  const currentYear = now.getFullYear()
  const fromDate = filter.fromDate ?? `${currentYear}-01-01`
  const toDate = filter.toDate ?? now.toISOString().slice(0, 10)
  const currentMonthPrefix = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data: invoicesRaw, error } = await adminClient
    .from('invoices')
    .select('id, invoice_number, client_id, status, invoice_date, total_net, clients(company_name, contact_name, profiles(full_name))')
    .in('status', ['versendet', 'bezahlt'])
    .eq('is_test', false)

  if (error) throw new DomainError(error.message)

  const rows = (invoicesRaw ?? []).map(({ clients, ...inv }) => {
    const client = Array.isArray(clients) ? clients[0] : clients
    const profile = client ? (Array.isArray(client.profiles) ? client.profiles[0] : client.profiles) : null
    return {
      ...inv,
      display_name: clientDisplayName(profile?.full_name, client?.contact_name, client?.company_name),
    }
  })

  const inRange = rows.filter((r) => r.invoice_date && r.invoice_date >= fromDate && r.invoice_date <= toDate)

  const revenueThisMonth = round2(
    rows.filter((r) => r.invoice_date?.startsWith(currentMonthPrefix)).reduce((sum, r) => sum + r.total_net, 0)
  )
  const revenueThisYear = round2(
    rows.filter((r) => r.invoice_date?.startsWith(String(currentYear))).reduce((sum, r) => sum + r.total_net, 0)
  )

  const openRows = rows.filter((r) => r.status === 'versendet')
  const openAmount = round2(openRows.reduce((sum, r) => sum + r.total_net, 0))

  const overdueCutoff = new Date(now)
  overdueCutoff.setDate(overdueCutoff.getDate() - OVERDUE_DAYS)
  const overdueCutoffStr = overdueCutoff.toISOString().slice(0, 10)
  const overdueAmount = round2(
    openRows.filter((r) => r.invoice_date && r.invoice_date < overdueCutoffStr).reduce((sum, r) => sum + r.total_net, 0)
  )

  const byMonthMap = new Map<string, number>()
  for (const r of inRange) {
    if (!r.invoice_date) continue
    const key = r.invoice_date.slice(0, 7)
    byMonthMap.set(key, round2((byMonthMap.get(key) ?? 0) + r.total_net))
  }
  const byMonth = [...byMonthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total_net]) => ({ month, total_net }))

  const byClientMap = new Map<string, { display_name: string; total_net: number }>()
  for (const r of inRange) {
    const existing = byClientMap.get(r.client_id)
    byClientMap.set(r.client_id, {
      display_name: r.display_name,
      total_net: round2((existing?.total_net ?? 0) + r.total_net),
    })
  }
  const byClient = [...byClientMap.entries()]
    .map(([client_id, v]) => ({ client_id, ...v }))
    .sort((a, b) => b.total_net - a.total_net)

  let byCategory: { kategorie: string; total_net: number }[] = []
  const invoiceIds = inRange.map((r) => r.id)
  if (invoiceIds.length > 0) {
    const { data: items, error: itemsError } = await adminClient
      .from('invoice_items')
      .select('invoice_id, gesamt, articles(kategorie)')
      .in('invoice_id', invoiceIds)
    if (itemsError) throw new DomainError(itemsError.message)

    const byCategoryMap = new Map<string, number>()
    for (const item of items ?? []) {
      const article = Array.isArray(item.articles) ? item.articles[0] : item.articles
      const kategorie = article?.kategorie ?? 'Ohne Kategorie'
      byCategoryMap.set(kategorie, round2((byCategoryMap.get(kategorie) ?? 0) + item.gesamt))
    }
    byCategory = [...byCategoryMap.entries()]
      .map(([kategorie, total_net]) => ({ kategorie, total_net }))
      .sort((a, b) => b.total_net - a.total_net)
  }

  const openInvoices = openRows
    .slice()
    .sort((a, b) => (a.invoice_date ?? '').localeCompare(b.invoice_date ?? ''))
    .slice(0, 8)
    .map((r) => ({
      id: r.id,
      invoice_number: r.invoice_number,
      display_name: r.display_name,
      invoice_date: r.invoice_date,
      total_net: r.total_net,
      is_overdue: !!r.invoice_date && r.invoice_date < overdueCutoffStr,
    }))

  return {
    total_net: round2(inRange.reduce((sum, r) => sum + r.total_net, 0)),
    revenue_this_month: revenueThisMonth,
    revenue_this_year: revenueThisYear,
    open_amount: openAmount,
    overdue_amount: overdueAmount,
    by_month: byMonth,
    by_client: byClient,
    by_category: byCategory,
    open_invoices: openInvoices,
  }
}
