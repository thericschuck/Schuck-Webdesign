import { createAdminClient } from '@/lib/supabase/admin'
import { DomainError } from './errors'
import { getCompanySettings } from './finance'
import { addProjectUpdate } from './projects'
import { sendEmail } from '@/lib/email/send'
import { generateAngebotPdf } from '@/lib/pdf/templates/angebot'
import { generateVertragPdf } from '@/lib/pdf/templates/vertrag'
import { generateBriefingPdf } from '@/lib/pdf/templates/briefing'
import { generateUebergabePdf } from '@/lib/pdf/templates/uebergabe'
import { generateCareReportPdf } from '@/lib/pdf/templates/care-report'
import { clientDisplayName } from '@/lib/client-name'
import { gatherCareReportData } from './care'
import { compressImageIfPossible, compressPdfIfPossible } from '@/lib/uploadCompression'
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB, formatMb } from '@/lib/uploadLimits'
import type { Document, DocumentCategory } from '@/types/database'

export const DOCUMENT_TEMPLATES = ['angebot', 'vertrag', 'briefing', 'uebergabe', 'care_report'] as const
export type DocumentTemplate = (typeof DOCUMENT_TEMPLATES)[number]

const TEMPLATE_CATEGORY: Record<DocumentTemplate, DocumentCategory> = {
  angebot: 'offer',
  vertrag: 'contract',
  briefing: 'briefing',
  uebergabe: 'handover',
  care_report: 'care_report',
}

const TEMPLATE_FOLDER: Record<DocumentTemplate, string> = {
  angebot: 'Angebote',
  vertrag: 'Verträge',
  briefing: 'Briefing-Protokolle',
  uebergabe: 'Übergabe-Dokumente',
  care_report: 'Care-Reports',
}

type SupabaseAdminClient = ReturnType<typeof createAdminClient>

/** Einziger Admin-Account des Systems — Dokumente haben keinen expliziten "erstellt von"-Kontext (JARVIS läuft service-role-seitig ohne Session). */
async function getAdminProfileId(adminClient: SupabaseAdminClient): Promise<string> {
  const { data, error } = await adminClient.from('profiles').select('id').eq('role', 'admin').limit(1).maybeSingle()
  if (error) throw new DomainError(error.message)
  if (!data) throw new DomainError('Kein Admin-Profil gefunden.')
  return data.id
}

// ── list ──────────────────────────────────────────────────────────────────

export interface ListDocumentsFilter {
  clientId?: string
  projectId?: string
  category?: DocumentCategory
}

export async function listDocuments(filter: ListDocumentsFilter = {}): Promise<Document[]> {
  const adminClient = createAdminClient()
  let query = adminClient.from('documents').select('*').order('created_at', { ascending: false })

  if (filter.clientId) query = query.eq('client_id', filter.clientId)
  if (filter.projectId) query = query.eq('project_id', filter.projectId)
  if (filter.category) query = query.eq('category', filter.category)

  const { data, error } = await query
  if (error) throw new DomainError(error.message)
  return data
}

// ── generate ──────────────────────────────────────────────────────────────

export interface GenerateDocumentInput {
  template: DocumentTemplate
  clientId: string
  projectId?: string | null
  /** Pflicht für template 'angebot' — für welches Angebot das PDF erzeugt wird. */
  offerId?: string | null
  /** Nur für template 'care_report' — Berichtsmonat, Format YYYY-MM. */
  month?: string | null
}

export async function generateDocument(input: GenerateDocumentInput): Promise<Document> {
  if (!DOCUMENT_TEMPLATES.includes(input.template)) {
    throw new DomainError(`Unbekanntes Template "${input.template}".`)
  }

  const adminClient = createAdminClient()

  const { data: clientRow, error: clientError } = await adminClient
    .from('clients')
    .select(
      'id, company_name, contact_name, client_number, website, address_street, address_zip, address_city, address_country, profiles(full_name)'
    )
    .eq('id', input.clientId)
    .single()
  if (clientError) throw new DomainError('Kunde nicht gefunden.')

  const clientProfile = Array.isArray(clientRow.profiles) ? clientRow.profiles[0] : clientRow.profiles
  const client = {
    id: clientRow.id,
    company_name: clientRow.company_name,
    contact_name: clientRow.contact_name,
    client_number: clientRow.client_number,
    address_street: clientRow.address_street,
    address_zip: clientRow.address_zip,
    address_city: clientRow.address_city,
    address_country: clientRow.address_country,
    full_name: clientProfile?.full_name ?? null,
  }
  const displayName = clientDisplayName(client.full_name, client.contact_name, client.company_name)

  let project: { id: string; title: string; description: string | null } | null = null
  if (input.projectId) {
    const { data, error } = await adminClient
      .from('projects')
      .select('id, title, description')
      .eq('id', input.projectId)
      .single()
    if (error) throw new DomainError('Projekt nicht gefunden.')
    project = data
  }

  const companySettings = await getCompanySettings()

  let pdfBytes: Uint8Array
  let name: string

  if (input.template === 'angebot') {
    if (!input.offerId) throw new DomainError('offer_id ist für das Angebot-Template erforderlich.')

    const [{ data: offer, error: offerError }, { data: items, error: itemsError }] = await Promise.all([
      adminClient.from('offers').select('*').eq('id', input.offerId).single(),
      adminClient.from('offer_items').select('*').eq('offer_id', input.offerId).order('pos', { ascending: true }),
    ])
    if (offerError) throw new DomainError('Angebot nicht gefunden.')
    if (itemsError) throw new DomainError(itemsError.message)
    if (offer.client_id && offer.client_id !== input.clientId) {
      throw new DomainError('Das Angebot gehört zu einem anderen Kunden.')
    }

    pdfBytes = await generateAngebotPdf({
      offerNumber: offer.offer_number,
      createdAt: offer.created_at,
      validUntil: offer.valid_until,
      totalNet: offer.total_net ?? 0,
      items: items ?? [],
      client,
      companySettings,
    })
    name = `Angebot-${offer.offer_number}.pdf`
  } else if (input.template === 'vertrag') {
    let offerNumber: string | null = null
    let totalNet: number | null = null
    let offerItems: { bezeichnung: string; menge: number; ep: number; gesamt: number }[] = []

    if (input.offerId) {
      const [{ data: offer }, { data: items }] = await Promise.all([
        adminClient.from('offers').select('offer_number, total_net').eq('id', input.offerId).single(),
        adminClient
          .from('offer_items')
          .select('bezeichnung, menge, ep, gesamt')
          .eq('offer_id', input.offerId)
          .order('pos', { ascending: true }),
      ])
      offerNumber = offer?.offer_number ?? null
      totalNet = offer?.total_net ?? null
      offerItems = items ?? []
    }

    pdfBytes = await generateVertragPdf({
      client,
      createdAt: new Date().toISOString(),
      projectTitle: project?.title,
      projectDescription: project?.description,
      offerNumber,
      offerItems,
      totalNet,
      companySettings,
    })
    name = `Vertrag-${client.client_number ?? displayName}-${Date.now()}.pdf`
  } else if (input.template === 'briefing') {
    pdfBytes = await generateBriefingPdf({
      client,
      createdAt: new Date().toISOString(),
      projectTitle: project?.title,
      projectDescription: project?.description,
      companySettings,
    })
    name = `Briefing-Protokoll-${client.client_number ?? displayName}-${Date.now()}.pdf`
  } else if (input.template === 'uebergabe') {
    pdfBytes = await generateUebergabePdf({
      client,
      createdAt: new Date().toISOString(),
      projectTitle: project?.title,
      companySettings,
    })
    name = `Uebergabe-${client.client_number ?? displayName}-${Date.now()}.pdf`
  } else {
    const month = input.month?.trim() || new Date().toISOString().slice(0, 7)
    const careData = await gatherCareReportData(clientRow.website, month)
    pdfBytes = await generateCareReportPdf({
      client,
      createdAt: new Date().toISOString(),
      data: careData,
      companySettings,
    })
    name = `Care-Report-${month}-${client.client_number ?? displayName}.pdf`
  }

  const uploadedBy = await getAdminProfileId(adminClient)
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${input.clientId}/${Date.now()}_${safeName}`

  const { error: uploadError } = await adminClient.storage
    .from('documents')
    .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: false })
  if (uploadError) throw new DomainError(`PDF konnte nicht gespeichert werden: ${uploadError.message}`)

  const { data: doc, error: dbError } = await adminClient
    .from('documents')
    .insert({
      client_id: input.clientId,
      project_id: input.projectId ?? null,
      name,
      file_url: storagePath,
      category: TEMPLATE_CATEGORY[input.template],
      folder: TEMPLATE_FOLDER[input.template],
      uploaded_by: uploadedBy,
    })
    .select('*')
    .single()

  if (dbError) {
    await adminClient.storage.from('documents').remove([storagePath])
    throw new DomainError(`Dokument konnte nicht gespeichert werden: ${dbError.message}`)
  }

  return doc
}

// ── send ──────────────────────────────────────────────────────────────────

export interface SendDocumentInput {
  documentId: string
  /** Optional — Default: hinterlegte Portal-E-Mail des Kunden. */
  to?: string
  subject?: string
  message?: string
}

export interface SendDocumentResult {
  sent: boolean
  to: string
}

export async function sendDocument(input: SendDocumentInput): Promise<SendDocumentResult> {
  const adminClient = createAdminClient()

  const { data: row, error } = await adminClient
    .from('documents')
    .select('*, clients(contact_email, profiles(email))')
    .eq('id', input.documentId)
    .single()
  if (error) throw new DomainError('Dokument nicht gefunden.')

  const { clients: clientRaw, ...document } = row
  const client = Array.isArray(clientRaw) ? clientRaw[0] : clientRaw
  const profile = client ? (Array.isArray(client.profiles) ? client.profiles[0] : client.profiles) : null
  const to = input.to ?? profile?.email ?? client?.contact_email ?? null
  if (!to) throw new DomainError('Keine Empfänger-E-Mail-Adresse angegeben oder für den Kunden hinterlegt.')

  const { data: fileBlob, error: downloadError } = await adminClient.storage.from('documents').download(document.file_url)
  if (downloadError) throw new DomainError(`Datei konnte nicht geladen werden: ${downloadError.message}`)

  const subject = input.subject?.trim() || `Dokument: ${document.name}`
  const bodyText = input.message?.trim() || `Anbei erhalten Sie das Dokument "${document.name}".`

  const result = await sendEmail({
    to,
    subject,
    html: bodyText.replace(/\n/g, '<br>'),
    attachment: { filename: document.name, content: new Uint8Array(await fileBlob.arrayBuffer()) },
  })
  if (!result.sent) throw new DomainError(`E-Mail konnte nicht gesendet werden: ${result.error}`)

  const stamp = `Dokument "${document.name}" per E-Mail an ${to} gesendet.`
  if (document.project_id) {
    await addProjectUpdate(document.project_id, stamp)
  } else {
    const { data: clientRow } = await adminClient.from('clients').select('notes').eq('id', document.client_id).single()
    const dated = `[${new Date().toLocaleDateString('de-DE')}] ${stamp}`
    const notes = clientRow?.notes ? `${clientRow.notes}\n${dated}` : dated
    await adminClient.from('clients').update({ notes }).eq('id', document.client_id)
  }

  return { sent: true, to }
}

// ── delete ────────────────────────────────────────────────────────────────

export async function deleteDocument(documentId: string): Promise<void> {
  const adminClient = createAdminClient()

  const { data: doc, error } = await adminClient.from('documents').select('file_url').eq('id', documentId).single()
  if (error) throw new DomainError('Dokument nicht gefunden.')

  await adminClient.storage.from('documents').remove([doc.file_url])

  const { error: deleteError } = await adminClient.from('documents').delete().eq('id', documentId)
  if (deleteError) throw new DomainError(deleteError.message)
}

// ── upload ────────────────────────────────────────────────────────────────
// Gemeinsame Logik für Portal- (app/(portal)/portal/upload/actions.ts) und
// Admin-Upload (app/(admin)/admin/projects/[id]/actions.ts) — beide Server Actions
// übernehmen nur noch Auth/Ownership-Check und rufen diese Funktion auf.

/** Eindeutig gefährliche ausführbare Formate — alles andere ist erlaubt (Schriftarten,
 * Design-Dateien, Archive, Office, Audio/Video, …). Endung statt MIME-Type, weil Browser
 * für exotischere Typen oft nur "application/octet-stream" oder gar nichts liefern. */
const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'ps1', 'vbs', 'vbe',
  'jar', 'app', 'dmg', 'sh', 'apk', 'dll', 'pif', 'jse', 'wsf', 'wsh', 'msc', 'cpl',
])

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

export interface UploadDocumentFileInput {
  file: File
  clientId: string
  projectId?: string | null
  folder?: string | null
  uploadedBy: string
}

export async function uploadDocumentFile(input: UploadDocumentFileInput): Promise<Document> {
  const { file } = input

  if (!file || file.size === 0) throw new DomainError('Bitte eine Datei auswählen.')

  const originalExtension = getExtension(file.name)
  if (DANGEROUS_EXTENSIONS.has(originalExtension)) {
    throw new DomainError('Dieser Dateityp ist aus Sicherheitsgründen nicht erlaubt.')
  }

  let bytes: Buffer = Buffer.from(await file.arrayBuffer())
  let contentType = file.type || 'application/octet-stream'
  let finalName = file.name

  if (bytes.length > MAX_UPLOAD_SIZE_BYTES) {
    const imageResult = await compressImageIfPossible(bytes, contentType)
    if (imageResult) {
      bytes = imageResult.buffer
      contentType = imageResult.mimeType
      finalName = file.name.replace(/\.[^./]+$/, `.${imageResult.extension}`)
    } else if (contentType === 'application/pdf') {
      const pdfResult = await compressPdfIfPossible(bytes)
      if (pdfResult) bytes = pdfResult
    }
  }

  if (bytes.length > MAX_UPLOAD_SIZE_BYTES) {
    throw new DomainError(
      `Datei zu groß (${formatMb(bytes.length)} MB) — auch nach Komprimierung über dem Limit von ${MAX_UPLOAD_SIZE_MB} MB.`
    )
  }

  const adminClient = createAdminClient()
  const safeName = finalName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${input.clientId}/${Date.now()}_${safeName}`

  const { error: uploadError } = await adminClient.storage
    .from('documents')
    .upload(storagePath, bytes, { contentType, upsert: false })
  if (uploadError) throw new DomainError(`Upload fehlgeschlagen: ${uploadError.message}`)

  const { data: doc, error: dbError } = await adminClient
    .from('documents')
    .insert({
      client_id: input.clientId,
      project_id: input.projectId ?? null,
      folder: input.folder ?? null,
      name: finalName,
      file_url: storagePath,
      category: 'other',
      uploaded_by: input.uploadedBy,
    })
    .select('*')
    .single()

  if (dbError) {
    await adminClient.storage.from('documents').remove([storagePath])
    throw new DomainError(`Datenbankfehler: ${dbError.message}`)
  }

  return doc
}
