import { z } from 'zod'
import { defineTool, type HelmToolDef } from '../types'
import { inviteClientUser, rollbackInvitedUser } from '@/lib/auth/invite-client'
import * as clientsDomain from '@/lib/domain/clients'
import { DomainError } from '@/lib/domain/errors'
import type { ClientStatus } from '@/types/database'

const CLIENT_STATUS_VALUES = clientsDomain.CLIENT_STATUS_VALUES as unknown as [string, ...string[]]

// ── list_clients ────────────────────────────────────────────────────────────

const listClients = defineTool({
  slug: 'list_clients',
  label: 'Kunden auflisten',
  description: 'Listet alle Kunden, optional gefiltert nach Status.',
  requiresConfirmation: false,
  schema: z.object({
    status: z.enum(CLIENT_STATUS_VALUES).optional().describe('Optionaler Filter nach Kundenstatus.'),
  }),
  async execute(args) {
    return clientsDomain.listClients({ status: (args.status as ClientStatus | undefined) ?? undefined })
  },
})

// ── get_client ──────────────────────────────────────────────────────────────

const getClient = defineTool({
  slug: 'get_client',
  label: 'Kunde abrufen',
  description: 'Liefert einen Kunden mit allen Feldern sowie seine verknüpften Projekte.',
  requiresConfirmation: false,
  schema: z.object({
    client_id: z.string().describe('UUID des Kunden (clients.id).'),
  }),
  async execute(args) {
    return clientsDomain.getClient(args.client_id)
  },
})

// ── create_client ───────────────────────────────────────────────────────────
// Invite-Flow (Supabase Auth) bleibt eigenständig (lib/auth/invite-client.ts) —
// nur bei send_invite:true wird er vorab aufgerufen und die profileId übergeben.
// Ohne send_invite entsteht ein Kunde ohne Portal-Zugang (siehe invite_client
// weiter unten für das spätere Nachholen).

const createClientTool = defineTool({
  slug: 'create_client',
  label: 'Kunde anlegen',
  description:
    'Legt einen neuen Kunden an und vergibt automatisch die nächste KD-Nummer. ' +
    'Sendet standardmäßig KEINE Portal-Einladung — der Kunde wird ohne Portal-Zugang angelegt. ' +
    'Nur mit send_invite:true wird sofort eine echte Einladungs-E-Mail versendet (dafür ist email dann Pflicht) — ' +
    'setze das nur, wenn aus dem Gespräch eindeutig hervorgeht, dass sofort eingeladen werden soll, sonst frag kurz nach.',
  requiresConfirmation: false,
  schema: z.object({
    full_name: z.string().min(1).describe('Name des Kunden/der Kontaktperson — primäre Bezeichnung.'),
    email: z
      .string()
      .optional()
      .describe(
        'E-Mail-Adresse. Ohne send_invite nur als Kontakt-E-Mail hinterlegt; mit send_invite:true Pflicht und erhält die Einladung.'
      ),
    send_invite: z.boolean().optional().describe('Ob sofort eine Portal-Einladungs-E-Mail versendet wird. Default: false.'),
    company_name: z.string().optional().describe('Firmenname (optional, nur falls vorhanden).'),
    website: z.string().optional().describe('Website-URL (optional).'),
    phone: z.string().optional().describe('Telefonnummer (optional).'),
    status: z.enum(CLIENT_STATUS_VALUES).optional().describe("Kundenstatus. Default 'pending'."),
    address_street: z.string().optional().describe('Straße + Hausnummer (optional).'),
    address_city: z.string().optional().describe('Stadt (optional).'),
    address_zip: z.string().optional().describe('Postleitzahl (optional).'),
    address_country: z.string().optional().describe("Land (optional, Default 'Deutschland')."),
    notes: z.string().optional().describe('Interne Notizen (optional).'),
  }),
  async execute(args) {
    const sendInvite = args.send_invite === true

    let profileId: string | null = null
    if (sendInvite) {
      if (!args.email) throw new Error('email ist erforderlich, wenn send_invite:true gesetzt ist.')
      ;({ profileId } = await inviteClientUser({ email: args.email, fullName: args.full_name }))
    }

    try {
      return await clientsDomain.createClient({
        profileId,
        contactName: args.full_name,
        contactEmail: args.email ?? null,
        companyName: args.company_name ?? null,
        status: (args.status as ClientStatus | undefined) ?? undefined,
        website: args.website ?? null,
        phone: args.phone ?? null,
        addressStreet: args.address_street ?? null,
        addressCity: args.address_city ?? null,
        addressZip: args.address_zip ?? null,
        addressCountry: args.address_country ?? null,
        notes: args.notes ?? null,
      })
    } catch (error) {
      if (profileId) await rollbackInvitedUser(profileId)
      throw error
    }
  },
})

// ── invite_client ────────────────────────────────────────────────────────────
// Gegenstück zu create_client ohne send_invite: lädt einen bereits bestehenden,
// profillosen Kunden nachträglich zum Portal ein.

const inviteClientTool = defineTool({
  slug: 'invite_client',
  label: 'Kunde einladen',
  description:
    'Lädt einen bereits bestehenden Kunden ohne Portal-Zugang nachträglich ein (echte E-Mail). ' +
    'Ohne email/full_name werden die beim Kunden hinterlegten contact_email/contact_name verwendet. ' +
    'Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    client_id: z.string().describe('UUID des Kunden (clients.id).'),
    email: z.string().optional().describe('E-Mail für die Einladung (optional, Default: contact_email des Kunden).'),
    full_name: z.string().optional().describe('Name für den Portal-Account (optional, Default: contact_name des Kunden).'),
  }),
  summarize: (args) => `Kunde ${args.client_id} zum Portal einladen${args.email ? ` (${args.email})` : ''}.`,
  async execute(args) {
    const client = await clientsDomain.getClient(args.client_id)
    if (client.profile_id) throw new DomainError('Kunde hat bereits Portal-Zugang.')

    const email = args.email ?? client.contact_email
    const fullName = args.full_name ?? client.contact_name
    if (!email) throw new DomainError('Keine E-Mail-Adresse angegeben oder beim Kunden hinterlegt.')

    const { profileId } = await inviteClientUser({ email, fullName: fullName ?? undefined })
    return clientsDomain.attachClientProfile(args.client_id, profileId)
  },
})

// ── update_client ───────────────────────────────────────────────────────────

const updateClient = defineTool({
  slug: 'update_client',
  label: 'Kunde aktualisieren',
  description: 'Aktualisiert Felder eines bestehenden Kunden.',
  requiresConfirmation: false,
  schema: z.object({
    client_id: z.string().describe('UUID des Kunden (clients.id).'),
    company_name: z.string().optional(),
    contact_name: z.string().optional().describe('Ansprechpartner-Name (nur relevant, solange kein Portal-Zugang besteht).'),
    contact_email: z.string().optional().describe('Kontakt-E-Mail (nur relevant, solange kein Portal-Zugang besteht).'),
    website: z.string().optional(),
    phone: z.string().optional(),
    status: z.enum(CLIENT_STATUS_VALUES).optional(),
    address_street: z.string().optional(),
    address_city: z.string().optional(),
    address_zip: z.string().optional(),
    address_country: z.string().optional(),
    notes: z.string().optional(),
  }),
  async execute(args) {
    return clientsDomain.updateClient(args.client_id, {
      company_name: args.company_name ?? undefined,
      contact_name: args.contact_name ?? null,
      contact_email: args.contact_email ?? null,
      website: args.website ?? null,
      phone: args.phone ?? null,
      status: (args.status as ClientStatus | undefined) ?? undefined,
      address_street: args.address_street ?? null,
      address_city: args.address_city ?? null,
      address_zip: args.address_zip ?? null,
      address_country: args.address_country ?? null,
      notes: args.notes ?? null,
    })
  },
})

// ── delete_client ───────────────────────────────────────────────────────────

const deleteClientTool = defineTool({
  slug: 'delete_client',
  label: 'Kunde löschen',
  description: 'Löscht einen Kunden unwiderruflich inkl. Portal-Zugang, allen Projekten und Dokumenten. Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    client_id: z.string().describe('UUID des Kunden (clients.id).'),
  }),
  summarize: (args) => `Kunde ${args.client_id} unwiderruflich löschen (inkl. Portal-Zugang, Projekte, Dokumente).`,
  async execute(args) {
    const result = await clientsDomain.deleteClient(args.client_id)
    return { deleted: true, display_name: result.displayName }
  },
})

export const clientTools: HelmToolDef[] = [
  listClients,
  getClient,
  createClientTool,
  inviteClientTool,
  updateClient,
  deleteClientTool,
]
