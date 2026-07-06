import type { JarvisTool } from '../tool-types'
import { optionalString, requireString } from './helpers'
import { inviteClientUser } from '@/lib/auth/invite-client'
import * as clientsDomain from '@/lib/domain/clients'
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
// diese Route ruft ihn zuerst auf und übergibt die profileId an die Domain-Funktion.

const createClientTool: JarvisTool = {
  name: 'create_client',
  requiresConfirmation: false,
  definition: {
    name: 'create_client',
    description:
      'Legt einen neuen Kunden an und vergibt automatisch die nächste KD-Nummer. ' +
      'Versendet dabei sofort eine Portal-Einladungs-E-Mail an die angegebene Adresse — ' +
      'informiere Eric davor kurz, wenn das nicht offensichtlich gewünscht ist.',
    input_schema: {
      type: 'object',
      properties: {
        full_name: { type: 'string', description: 'Name des Kunden/der Kontaktperson — primäre Bezeichnung.' },
        email: {
          type: 'string',
          description: 'E-Mail-Adresse für den Portal-Zugang. Erhält automatisch eine Einladung.',
        },
        company_name: { type: 'string', description: 'Firmenname (optional, nur falls vorhanden).' },
        website: { type: 'string', description: 'Website-URL (optional).' },
        phone: { type: 'string', description: 'Telefonnummer (optional).' },
        status: {
          type: 'string',
          enum: CLIENT_STATUS_VALUES,
          description: "Kundenstatus. Default 'pending' (eingeladen, wartet auf ersten Login).",
        },
        address_street: { type: 'string', description: 'Straße + Hausnummer (optional).' },
        address_city: { type: 'string', description: 'Stadt (optional).' },
        address_zip: { type: 'string', description: 'Postleitzahl (optional).' },
        address_country: { type: 'string', description: "Land (optional, Default 'Deutschland')." },
        notes: { type: 'string', description: 'Interne Notizen (optional).' },
      },
      required: ['full_name', 'email'],
    },
  },
  async execute(args) {
    const fullName = requireString(args, 'full_name')
    const { profileId } = await inviteClientUser({
      email: requireString(args, 'email'),
      fullName,
    })

    return clientsDomain.createClient({
      profileId,
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
  updateClient,
  deleteClientTool,
]
