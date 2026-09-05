import type { JarvisTool } from '../tool-types'
import { optionalString, requireString } from './helpers'
import { inviteClientUser, rollbackInvitedUser } from '@/lib/auth/invite-client'
import * as clientsDomain from '@/lib/domain/clients'
import { DomainError } from '@/lib/domain/errors'
import type { ClientStatus } from '@/types/database'

const CLIENT_STATUS_VALUES = clientsDomain.CLIENT_STATUS_VALUES

// ── list_clients ────────────────────────────────────────────────────────────

const listClients: JarvisTool = {
  name: 'list_clients',
  requiresConfirmation: false,
  definition: {
    name: 'list_clients',
    description: 'Listet alle Kunden, optional gefiltert nach Status.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: CLIENT_STATUS_VALUES,
          description: 'Optionaler Filter nach Kundenstatus.',
        },
      },
    },
  },
  async execute(args) {
    const status = optionalString(args, 'status') as ClientStatus | null
    return clientsDomain.listClients({ status: status ?? undefined })
  },
}

// ── get_client ──────────────────────────────────────────────────────────────

const getClient: JarvisTool = {
  name: 'get_client',
  requiresConfirmation: false,
  definition: {
    name: 'get_client',
    description: 'Liefert einen Kunden mit allen Feldern sowie seine verknüpften Projekte.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'UUID des Kunden (clients.id).' },
      },
      required: ['client_id'],
    },
  },
  async execute(args) {
    return clientsDomain.getClient(requireString(args, 'client_id'))
  },
}

// ── create_client ───────────────────────────────────────────────────────────
// Invite-Flow (Supabase Auth) bleibt eigenständig (lib/auth/invite-client.ts) —
// nur bei send_invite:true wird er vorab aufgerufen und die profileId übergeben.
// Ohne send_invite entsteht ein Kunde ohne Portal-Zugang (siehe invite_client
// weiter unten für das spätere Nachholen).

const createClientTool: JarvisTool = {
  name: 'create_client',
  requiresConfirmation: false,
  definition: {
    name: 'create_client',
    description:
      'Legt einen neuen Kunden an und vergibt automatisch die nächste KD-Nummer. ' +
      'Sendet standardmäßig KEINE Portal-Einladung — der Kunde wird ohne Portal-Zugang angelegt. ' +
      'Nur mit send_invite:true wird sofort eine echte Einladungs-E-Mail versendet (dafür ist email dann Pflicht) — ' +
      'setze das nur, wenn aus dem Gespräch eindeutig hervorgeht, dass sofort eingeladen werden soll, sonst frag kurz nach.',
    input_schema: {
      type: 'object',
      properties: {
        full_name: { type: 'string', description: 'Name des Kunden/der Kontaktperson — primäre Bezeichnung.' },
        email: {
          type: 'string',
          description: 'E-Mail-Adresse. Ohne send_invite nur als Kontakt-E-Mail hinterlegt; mit send_invite:true Pflicht und erhält die Einladung.',
        },
        send_invite: {
          type: 'boolean',
          description: 'Ob sofort eine Portal-Einladungs-E-Mail versendet wird. Default: false.',
        },
        company_name: { type: 'string', description: 'Firmenname (optional, nur falls vorhanden).' },
        website: { type: 'string', description: 'Website-URL (optional).' },
        phone: { type: 'string', description: 'Telefonnummer (optional).' },
        status: {
          type: 'string',
          enum: CLIENT_STATUS_VALUES,
          description: "Kundenstatus. Default 'pending'.",
        },
        address_street: { type: 'string', description: 'Straße + Hausnummer (optional).' },
        address_city: { type: 'string', description: 'Stadt (optional).' },
        address_zip: { type: 'string', description: 'Postleitzahl (optional).' },
        address_country: { type: 'string', description: "Land (optional, Default 'Deutschland')." },
        notes: { type: 'string', description: 'Interne Notizen (optional).' },
      },
      required: ['full_name'],
    },
  },
  async execute(args) {
    const fullName = requireString(args, 'full_name')
    const email = optionalString(args, 'email')
    const sendInvite = args.send_invite === true

    let profileId: string | null = null
    if (sendInvite) {
      if (!email) throw new Error('email ist erforderlich, wenn send_invite:true gesetzt ist.')
      ;({ profileId } = await inviteClientUser({ email, fullName }))
    }

    try {
      return await clientsDomain.createClient({
        profileId,
        contactName: fullName,
        contactEmail: email,
        companyName: optionalString(args, 'company_name'),
        status: (optionalString(args, 'status') as ClientStatus | null) ?? undefined,
        website: optionalString(args, 'website'),
        phone: optionalString(args, 'phone'),
        addressStreet: optionalString(args, 'address_street'),
        addressCity: optionalString(args, 'address_city'),
        addressZip: optionalString(args, 'address_zip'),
        addressCountry: optionalString(args, 'address_country'),
        notes: optionalString(args, 'notes'),
      })
    } catch (error) {
      if (profileId) await rollbackInvitedUser(profileId)
      throw error
    }
  },
}

// ── invite_client ────────────────────────────────────────────────────────────
// Gegenstück zu create_client ohne send_invite: lädt einen bereits bestehenden,
// profillosen Kunden nachträglich zum Portal ein.

const inviteClientTool: JarvisTool = {
  name: 'invite_client',
  requiresConfirmation: true,
  definition: {
    name: 'invite_client',
    description:
      'Lädt einen bereits bestehenden Kunden ohne Portal-Zugang nachträglich ein (echte E-Mail). ' +
      'Ohne email/full_name werden die beim Kunden hinterlegten contact_email/contact_name verwendet. ' +
      'Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'UUID des Kunden (clients.id).' },
        email: { type: 'string', description: 'E-Mail für die Einladung (optional, Default: contact_email des Kunden).' },
        full_name: { type: 'string', description: 'Name für den Portal-Account (optional, Default: contact_name des Kunden).' },
      },
      required: ['client_id'],
    },
  },
  async execute(args) {
    const clientId = requireString(args, 'client_id')
    const client = await clientsDomain.getClient(clientId)
    if (client.profile_id) throw new DomainError('Kunde hat bereits Portal-Zugang.')

    const email = optionalString(args, 'email') ?? client.contact_email
    const fullName = optionalString(args, 'full_name') ?? client.contact_name
    if (!email) throw new DomainError('Keine E-Mail-Adresse angegeben oder beim Kunden hinterlegt.')

    const { profileId } = await inviteClientUser({ email, fullName: fullName ?? undefined })
    return clientsDomain.attachClientProfile(clientId, profileId)
  },
}

// ── update_client ───────────────────────────────────────────────────────────

const updateClient: JarvisTool = {
  name: 'update_client',
  requiresConfirmation: false,
  definition: {
    name: 'update_client',
    description: 'Aktualisiert Felder eines bestehenden Kunden.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'UUID des Kunden (clients.id).' },
        company_name: { type: 'string' },
        contact_name: { type: 'string', description: 'Ansprechpartner-Name (nur relevant, solange kein Portal-Zugang besteht).' },
        contact_email: { type: 'string', description: 'Kontakt-E-Mail (nur relevant, solange kein Portal-Zugang besteht).' },
        website: { type: 'string' },
        phone: { type: 'string' },
        status: { type: 'string', enum: CLIENT_STATUS_VALUES },
        address_street: { type: 'string' },
        address_city: { type: 'string' },
        address_zip: { type: 'string' },
        address_country: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['client_id'],
    },
  },
  async execute(args) {
    const clientId = requireString(args, 'client_id')
    return clientsDomain.updateClient(clientId, {
      company_name: optionalString(args, 'company_name') ?? undefined,
      contact_name: optionalString(args, 'contact_name'),
      contact_email: optionalString(args, 'contact_email'),
      website: optionalString(args, 'website'),
      phone: optionalString(args, 'phone'),
      status: (optionalString(args, 'status') as ClientStatus | null) ?? undefined,
      address_street: optionalString(args, 'address_street'),
      address_city: optionalString(args, 'address_city'),
      address_zip: optionalString(args, 'address_zip'),
      address_country: optionalString(args, 'address_country'),
      notes: optionalString(args, 'notes'),
    })
  },
}

// ── delete_client ───────────────────────────────────────────────────────────

const deleteClientTool: JarvisTool = {
  name: 'delete_client',
  requiresConfirmation: true,
  definition: {
    name: 'delete_client',
    description:
      'Löscht einen Kunden unwiderruflich inkl. Portal-Zugang, allen Projekten und Dokumenten. ' +
      'Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'UUID des Kunden (clients.id).' },
      },
      required: ['client_id'],
    },
  },
  async execute(args) {
    const result = await clientsDomain.deleteClient(requireString(args, 'client_id'))
    return { deleted: true, display_name: result.displayName }
  },
}

export const clientTools: JarvisTool[] = [
  listClients,
  getClient,
  createClientTool,
  inviteClientTool,
  updateClient,
  deleteClientTool,
]
