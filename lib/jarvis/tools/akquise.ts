import type { JarvisTool } from '../tool-types'
import { optionalNumber, optionalString, requireString } from './helpers'
import * as akquiseDomain from '@/lib/domain/akquise'
import { syncAkquiseFromSheet } from '@/lib/domain/akquise-sync'
import type { AkquiseErgebnis, ClientStatus, LeadPrioritaet, LeadStage, QualiErgebnis, SalesErgebnis } from '@/types/database'

const LEAD_STAGE_VALUES = akquiseDomain.LEAD_STAGE_VALUES
const LEAD_PRIORITAET_VALUES = akquiseDomain.LEAD_PRIORITAET_VALUES
const AKQUISE_ERGEBNIS_VALUES = akquiseDomain.AKQUISE_ERGEBNIS_VALUES
const QUALI_ERGEBNIS_VALUES = akquiseDomain.QUALI_ERGEBNIS_VALUES
const SALES_ERGEBNIS_VALUES = akquiseDomain.SALES_ERGEBNIS_VALUES

// ── list_contact_submissions ─────────────────────────────────────────────────

const listContactSubmissions: JarvisTool = {
  name: 'list_contact_submissions',
  requiresConfirmation: false,
  definition: {
    name: 'list_contact_submissions',
    description: 'Listet Kontaktanfragen aus dem Website-Kontaktformular, nach Datum sortiert (neueste zuerst).',
    input_schema: {
      type: 'object',
      properties: {
        include_read: {
          type: 'boolean',
          description: 'Auch bereits gelesene Anfragen einbeziehen. Default: false (nur unbearbeitete).',
        },
      },
    },
  },
  async execute(args) {
    return akquiseDomain.listContactSubmissions({ includeRead: args.include_read === true })
  },
}

// ── list_leads ──────────────────────────────────────────────────────────────

const listLeads: JarvisTool = {
  name: 'list_leads',
  requiresConfirmation: false,
  definition: {
    name: 'list_leads',
    description: 'Listet Leads, optional gefiltert nach Funnel-Stage, Priorität, Quelle, fälliger Wiedervorlage oder Firmenname (Suche).',
    input_schema: {
      type: 'object',
      properties: {
        current_stage: { type: 'string', enum: LEAD_STAGE_VALUES, description: 'Optionaler Filter nach Funnel-Stage.' },
        prioritaet: { type: 'string', enum: LEAD_PRIORITAET_VALUES, description: 'Optionaler Filter nach Priorität.' },
        quelle: { type: 'string', description: "Optionaler Filter nach Quelle, z.B. 'KI', 'Google', 'Netzwerk' (optional)." },
        wiedervorlage_faellig: {
          type: 'boolean',
          description: 'Nur Leads mit Wiedervorlage heute oder früher (optional).',
        },
        search: { type: 'string', description: 'Freitextsuche über den Firmennamen (optional).' },
      },
    },
  },
  async execute(args) {
    return akquiseDomain.listLeads({
      currentStage: (optionalString(args, 'current_stage') as LeadStage | null) ?? undefined,
      prioritaet: (optionalString(args, 'prioritaet') as LeadPrioritaet | null) ?? undefined,
      quelle: optionalString(args, 'quelle') ?? undefined,
      wiedervorlageDue: args.wiedervorlage_faellig === true,
      search: optionalString(args, 'search') ?? undefined,
    })
  },
}

// ── get_lead ────────────────────────────────────────────────────────────────

const getLead: JarvisTool = {
  name: 'get_lead',
  requiresConfirmation: false,
  definition: {
    name: 'get_lead',
    description: 'Liefert einen Lead mit allen Funnel-Daten (Quali-Call und Sales-Call, falls vorhanden).',
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID des Leads (leads.id).' },
      },
      required: ['lead_id'],
    },
  },
  async execute(args) {
    return akquiseDomain.getLead(requireString(args, 'lead_id'))
  },
}

// ── create_lead ─────────────────────────────────────────────────────────────

const createLead: JarvisTool = {
  name: 'create_lead',
  requiresConfirmation: false,
  definition: {
    name: 'create_lead',
    description: 'Legt einen neuen Lead an und vergibt automatisch die nächste L-Nummer.',
    input_schema: {
      type: 'object',
      properties: {
        firmenname: { type: 'string', description: 'Firmenname des Leads.' },
        ansprechpartner: { type: 'string', description: 'Name der Kontaktperson (optional).' },
        position: { type: 'string', description: 'Position der Kontaktperson (optional).' },
        zielgruppe: { type: 'string', description: 'Freitext-Kategorie, z.B. "Coaches & Berater" (optional).' },
        stadt: { type: 'string', description: 'Stadt (optional).' },
        website: { type: 'string', description: 'Website-URL (optional).' },
        phone: { type: 'string', description: 'Telefonnummer (optional).' },
        email: { type: 'string', description: 'E-Mail-Adresse (optional).' },
        quelle: { type: 'string', description: "Herkunft, z.B. 'KI', 'Google', 'Netzwerk', 'Website', 'Empfehlung' (optional)." },
        website_qualitaet: {
          type: 'string',
          description: "z.B. 'Sehr schlecht', 'Schlecht', 'Ausbaufähig', 'OK', 'Gut', 'Keine Website' (optional).",
        },
        prioritaet: { type: 'string', enum: LEAD_PRIORITAET_VALUES, description: "Priorität, Default 'medium'." },
        notizen: { type: 'string', description: 'Interne Notizen (optional).' },
      },
      required: ['firmenname'],
    },
  },
  async execute(args) {
    return akquiseDomain.createLead({
      firmenname: requireString(args, 'firmenname'),
      ansprechpartner: optionalString(args, 'ansprechpartner'),
      position: optionalString(args, 'position'),
      zielgruppe: optionalString(args, 'zielgruppe'),
      stadt: optionalString(args, 'stadt'),
      website: optionalString(args, 'website'),
      phone: optionalString(args, 'phone'),
      email: optionalString(args, 'email'),
      quelle: optionalString(args, 'quelle'),
      websiteQualitaet: optionalString(args, 'website_qualitaet'),
      prioritaet: (optionalString(args, 'prioritaet') as LeadPrioritaet | null) ?? undefined,
      notizen: optionalString(args, 'notizen'),
    })
  },
}

// ── update_lead ─────────────────────────────────────────────────────────────

const updateLead: JarvisTool = {
  name: 'update_lead',
  requiresConfirmation: false,
  definition: {
    name: 'update_lead',
    description: 'Aktualisiert Felder eines bestehenden Leads (z.B. akquise_ergebnis, wiedervorlage, notizen).',
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID des Leads (leads.id).' },
        firmenname: { type: 'string' },
        ansprechpartner: { type: 'string' },
        position: { type: 'string' },
        zielgruppe: { type: 'string' },
        stadt: { type: 'string' },
        website: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        quelle: { type: 'string' },
        website_qualitaet: { type: 'string' },
        prioritaet: { type: 'string', enum: LEAD_PRIORITAET_VALUES },
        erstkontakt_am: { type: 'string', description: 'Format YYYY-MM-DD.' },
        akquise_ergebnis: { type: 'string', enum: AKQUISE_ERGEBNIS_VALUES },
        wiedervorlage: { type: 'string', description: 'Format YYYY-MM-DD.' },
        notizen: { type: 'string' },
        current_stage: { type: 'string', enum: LEAD_STAGE_VALUES },
      },
      required: ['lead_id'],
    },
  },
  async execute(args) {
    const leadId = requireString(args, 'lead_id')
    return akquiseDomain.updateLead(leadId, {
      firmenname: optionalString(args, 'firmenname') ?? undefined,
      ansprechpartner: optionalString(args, 'ansprechpartner'),
      position: optionalString(args, 'position'),
      zielgruppe: optionalString(args, 'zielgruppe'),
      stadt: optionalString(args, 'stadt'),
      website: optionalString(args, 'website'),
      phone: optionalString(args, 'phone'),
      email: optionalString(args, 'email'),
      quelle: optionalString(args, 'quelle'),
      website_qualitaet: optionalString(args, 'website_qualitaet'),
      prioritaet: (optionalString(args, 'prioritaet') as LeadPrioritaet | null) ?? undefined,
      erstkontakt_am: optionalString(args, 'erstkontakt_am'),
      akquise_ergebnis: (optionalString(args, 'akquise_ergebnis') as AkquiseErgebnis | null) ?? undefined,
      wiedervorlage: optionalString(args, 'wiedervorlage'),
      notizen: optionalString(args, 'notizen'),
      current_stage: (optionalString(args, 'current_stage') as LeadStage | null) ?? undefined,
    })
  },
}

// ── add_quali_call ──────────────────────────────────────────────────────────

const addQualiCall: JarvisTool = {
  name: 'add_quali_call',
  requiresConfirmation: false,
  definition: {
    name: 'add_quali_call',
    description: 'Legt einen Quali-Call-Eintrag für einen Lead an und setzt dessen Stage auf quali_call.',
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID des Leads (leads.id).' },
        quali_call_am: { type: 'string', description: 'Datum des Calls, Format YYYY-MM-DD (optional).' },
        quali_ergebnis: {
          type: 'string',
          enum: QUALI_ERGEBNIS_VALUES,
          description: "Ergebnis des Calls, Default 'offen'.",
        },
        wiedervorlage: { type: 'string', description: 'Wiedervorlage-Datum, Format YYYY-MM-DD (optional).' },
        bedarf_notizen: { type: 'string', description: 'Notizen zum ermittelten Bedarf (optional).' },
      },
      required: ['lead_id'],
    },
  },
  async execute(args) {
    return akquiseDomain.addQualiCall(requireString(args, 'lead_id'), {
      qualiCallAm: optionalString(args, 'quali_call_am'),
      qualiErgebnis: (optionalString(args, 'quali_ergebnis') as QualiErgebnis | null) ?? undefined,
      wiedervorlage: optionalString(args, 'wiedervorlage'),
      bedarfNotizen: optionalString(args, 'bedarf_notizen'),
    })
  },
}

// ── add_sales_call ──────────────────────────────────────────────────────────

const addSalesCall: JarvisTool = {
  name: 'add_sales_call',
  requiresConfirmation: false,
  definition: {
    name: 'add_sales_call',
    description: 'Legt einen Sales-/Closing-Call-Eintrag für einen Lead an und setzt dessen Stage auf closing_call.',
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID des Leads (leads.id).' },
        closing_call_am: { type: 'string', description: 'Datum des Calls, Format YYYY-MM-DD (optional).' },
        leistungen: { type: 'string', description: 'Besprochene Leistungen (optional).' },
        angebotsvolumen: { type: 'number', description: 'Angebotsvolumen in Euro (optional).' },
        leistungsbeginn: { type: 'string', description: 'Geplanter Leistungsbeginn, Format YYYY-MM-DD (optional).' },
        sales_ergebnis: {
          type: 'string',
          enum: SALES_ERGEBNIS_VALUES,
          description: "Ergebnis des Calls, Default 'offen'.",
        },
        notizen: { type: 'string', description: 'Notizen (optional).' },
      },
      required: ['lead_id'],
    },
  },
  async execute(args) {
    return akquiseDomain.addSalesCall(requireString(args, 'lead_id'), {
      closingCallAm: optionalString(args, 'closing_call_am'),
      leistungen: optionalString(args, 'leistungen'),
      angebotsvolumen: optionalNumber(args, 'angebotsvolumen'),
      leistungsbeginn: optionalString(args, 'leistungsbeginn'),
      salesErgebnis: (optionalString(args, 'sales_ergebnis') as SalesErgebnis | null) ?? undefined,
      notizen: optionalString(args, 'notizen'),
    })
  },
}

// ── convert_lead_to_client ────────────────────────────────────────────────────

const convertLeadToClient: JarvisTool = {
  name: 'convert_lead_to_client',
  requiresConfirmation: true,
  definition: {
    name: 'convert_lead_to_client',
    description:
      'Wandelt einen gewonnenen Lead in einen Kunden um: legt den Kunden an, vergibt die KD-Nummer und verknüpft ' +
      'den Lead. Sendet standardmäßig KEINE Portal-Einladung. Nur mit send_invite:true wird sofort eine echte ' +
      'Einladungs-E-Mail versendet (dafür ist email dann Pflicht). Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID des Leads (leads.id).' },
        email: {
          type: 'string',
          description: 'E-Mail-Adresse (optional, Default: die beim Lead hinterlegte E-Mail). Mit send_invite:true Pflicht.',
        },
        send_invite: {
          type: 'boolean',
          description: 'Ob sofort eine Portal-Einladungs-E-Mail versendet wird. Default: false.',
        },
        status: {
          type: 'string',
          enum: ['lead', 'pending', 'active', 'paused', 'inactive', 'completed'],
          description: "Kundenstatus des neuen Kunden, Default 'pending'.",
        },
      },
      required: ['lead_id'],
    },
  },
  async execute(args) {
    return akquiseDomain.convertLeadToClient(requireString(args, 'lead_id'), {
      email: optionalString(args, 'email') ?? undefined,
      sendInvite: args.send_invite === true,
      status: (optionalString(args, 'status') as ClientStatus | null) ?? undefined,
    })
  },
}

// ── create_offer ────────────────────────────────────────────────────────────

interface OfferItemArg {
  art_nr?: string
  pkt_nr?: string
  bezeichnung?: string
  menge?: number
  ep: number
}

function isOfferItemArg(value: unknown): value is OfferItemArg {
  return typeof value === 'object' && value !== null && typeof (value as OfferItemArg).ep === 'number'
}

const createOffer: JarvisTool = {
  name: 'create_offer',
  requiresConfirmation: false,
  definition: {
    name: 'create_offer',
    description:
      'Erstellt ein Angebot (Entwurf) aus Artikeln/Paketen und vergibt sofort die AN-Nummer. ' +
      'Der Festpreis je Position (ep) muss innerhalb der Katalog-Preisspanne gewählt und explizit angegeben werden — ' +
      'noch keine PDF-Erzeugung (folgt in Phase 5).',
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID des Leads (optional, falls Angebot an einen Lead geht).' },
        client_id: { type: 'string', description: 'UUID des Kunden (optional, falls Angebot an einen Bestandskunden geht).' },
        valid_until: { type: 'string', description: 'Gültig bis, Format YYYY-MM-DD (optional).' },
        items: {
          type: 'array',
          description: 'Angebotspositionen.',
          items: {
            type: 'object',
            properties: {
              art_nr: { type: 'string', description: 'Artikelnummer (optional, falls Position auf einen Katalogartikel verweist).' },
              pkt_nr: { type: 'string', description: 'Paketnummer (optional, falls Position ein ganzes Paket ist).' },
              bezeichnung: { type: 'string', description: 'Freitext-Bezeichnung, überschreibt Artikel-/Paketname (optional).' },
              menge: { type: 'number', description: 'Menge, Default 1.' },
              ep: { type: 'number', description: 'Einzelpreis (Festpreis innerhalb der Katalog-Preisspanne).' },
            },
            required: ['ep'],
          },
        },
      },
      required: ['items'],
    },
  },
  async execute(args) {
    const rawItems = args.items
    if (!Array.isArray(rawItems) || rawItems.length === 0 || !rawItems.every(isOfferItemArg)) {
      throw new Error('items ist erforderlich und muss mindestens eine Position mit ep enthalten.')
    }

    return akquiseDomain.createOffer({
      leadId: optionalString(args, 'lead_id'),
      clientId: optionalString(args, 'client_id'),
      validUntil: optionalString(args, 'valid_until'),
      items: rawItems.map((item) => ({
        artNr: item.art_nr,
        pktNr: item.pkt_nr,
        bezeichnung: item.bezeichnung,
        menge: item.menge,
        ep: item.ep,
      })),
    })
  },
}

// ── draft_followup_email ──────────────────────────────────────────────────────

const draftFollowupEmail: JarvisTool = {
  name: 'draft_followup_email',
  requiresConfirmation: false,
  definition: {
    name: 'draft_followup_email',
    description:
      'Verfasst einen Follow-Up-E-Mail-Entwurf für einen Lead (nur Text, kein Versand — send_followup_email folgt erst in Phase 5).',
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID des Leads (leads.id).' },
        anlass: { type: 'string', description: 'Anlass/Kontext für den Follow-Up, z.B. "nach Quali-Call" (optional).' },
      },
      required: ['lead_id'],
    },
  },
  async execute(args) {
    return akquiseDomain.draftFollowupEmail(requireString(args, 'lead_id'), optionalString(args, 'anlass'))
  },
}

// ── send_followup_email ────────────────────────────────────────────────────

const sendFollowupEmail: JarvisTool = {
  name: 'send_followup_email',
  requiresConfirmation: true,
  definition: {
    name: 'send_followup_email',
    description:
      'Verfasst und versendet direkt eine Follow-Up-E-Mail an den Lead (nutzt draft_followup_email intern) und ' +
      'protokolliert den Versand in den Lead-Notizen. Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID des Leads (leads.id).' },
        anlass: { type: 'string', description: 'Anlass/Kontext für den Follow-Up, z.B. "nach Quali-Call" (optional).' },
      },
      required: ['lead_id'],
    },
  },
  async execute(args) {
    return akquiseDomain.sendFollowupEmail(requireString(args, 'lead_id'), optionalString(args, 'anlass'))
  },
}

// ── set_wiedervorlage ─────────────────────────────────────────────────────────

const setWiedervorlage: JarvisTool = {
  name: 'set_wiedervorlage',
  requiresConfirmation: false,
  definition: {
    name: 'set_wiedervorlage',
    description: 'Setzt das Wiedervorlage-Datum eines Leads und legt automatisch ein zugehöriges Todo an.',
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID des Leads (leads.id).' },
        wiedervorlage: { type: 'string', description: 'Wiedervorlage-Datum, Format YYYY-MM-DD.' },
        notiz: { type: 'string', description: 'Kurzer Hinweis für das Todo (optional).' },
      },
      required: ['lead_id', 'wiedervorlage'],
    },
  },
  async execute(args) {
    return akquiseDomain.setWiedervorlage(
      requireString(args, 'lead_id'),
      requireString(args, 'wiedervorlage'),
      optionalString(args, 'notiz')
    )
  },
}

// ── log_akquise_tracking ──────────────────────────────────────────────────────

const logAkquiseTracking: JarvisTool = {
  name: 'log_akquise_tracking',
  requiresConfirmation: false,
  definition: {
    name: 'log_akquise_tracking',
    description:
      'Trägt tägliche Kalt-Akquise-Aktivitäten ein (Wählversuche, Gespräche, Termine). Werte werden zum jeweiligen Tag addiert, nicht überschrieben.',
    input_schema: {
      type: 'object',
      properties: {
        datum: { type: 'string', description: 'Datum, Format YYYY-MM-DD. Default: heute.' },
        waehlversuche: { type: 'number', description: 'Anzahl Wählversuche (optional).' },
        gespraeche_empfang: { type: 'number', description: 'Gespräche mit Empfang/Zentrale (optional).' },
        gespraeche_entscheider: { type: 'number', description: 'Gespräche mit Entscheider (optional).' },
        termine_vereinbart: { type: 'number', description: 'Vereinbarte Termine (optional).' },
      },
    },
  },
  async execute(args) {
    return akquiseDomain.logAkquiseTracking({
      datum: optionalString(args, 'datum') ?? undefined,
      waehlversuche: optionalNumber(args, 'waehlversuche') ?? undefined,
      gespraecheEmpfang: optionalNumber(args, 'gespraeche_empfang') ?? undefined,
      gespraecheEntscheider: optionalNumber(args, 'gespraeche_entscheider') ?? undefined,
      termineVereinbart: optionalNumber(args, 'termine_vereinbart') ?? undefined,
    })
  },
}

// ── get_funnel_stats ──────────────────────────────────────────────────────────

const getFunnelStats: JarvisTool = {
  name: 'get_funnel_stats',
  requiresConfirmation: false,
  definition: {
    name: 'get_funnel_stats',
    description: 'Berechnet Funnel-Verteilung und Konversionsraten zwischen den Stages aus allen Leads.',
    input_schema: { type: 'object', properties: {} },
  },
  async execute() {
    return akquiseDomain.getFunnelStats()
  },
}

// ── get_akquise_sync_status ──────────────────────────────────────────────────

const getAkquiseSyncStatus: JarvisTool = {
  name: 'get_akquise_sync_status',
  requiresConfirmation: false,
  definition: {
    name: 'get_akquise_sync_status',
    description:
      'Zeigt Zeitpunkt und Ergebnis des letzten Google-Sheet-Syncs der Akquise-Daten (Leads/Calls/Tracking) — ' +
      'inklusive Warnungen wie nicht zuordenbare Sheet-Werte.',
    input_schema: { type: 'object', properties: {} },
  },
  async execute() {
    const [lastSyncedAt, lastSync] = await Promise.all([
      akquiseDomain.getLastSheetSyncAt(),
      akquiseDomain.getLastSyncMessage(),
    ])
    return { last_synced_at: lastSyncedAt, last_sync_success: lastSync?.success ?? null, last_sync_message: lastSync?.message ?? null }
  },
}

// ── sync_akquise_sheet ────────────────────────────────────────────────────────

const syncAkquiseSheet: JarvisTool = {
  name: 'sync_akquise_sheet',
  requiresConfirmation: true,
  definition: {
    name: 'sync_akquise_sheet',
    description:
      'Zieht Leads, Quali-/Sales-Calls und Tages-Tracking frisch aus dem Akquise-Google-Sheet und gleicht sie mit ' +
      'der Datenbank ab (dieselbe Aktion wie der "Sheet synchronisieren"-Button in /admin/akquise). Erfordert ' +
      'Bestätigung, da es Leads/Calls/Tracking in der Datenbank verändert.',
    input_schema: { type: 'object', properties: {} },
  },
  async execute() {
    return syncAkquiseFromSheet()
  },
}

export const akquiseTools: JarvisTool[] = [
  listContactSubmissions,
  listLeads,
  getLead,
  createLead,
  updateLead,
  addQualiCall,
  addSalesCall,
  convertLeadToClient,
  createOffer,
  draftFollowupEmail,
  sendFollowupEmail,
  setWiedervorlage,
  logAkquiseTracking,
  getFunnelStats,
  getAkquiseSyncStatus,
  syncAkquiseSheet,
]
