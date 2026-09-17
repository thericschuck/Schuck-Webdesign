import { z } from 'zod'
import { defineTool, type HelmToolDef } from '../types'
import * as akquiseDomain from '@/lib/domain/akquise'
import { syncAkquiseFromSheet } from '@/lib/domain/akquise-sync'
import type { AkquiseErgebnis, ClientStatus, LeadPrioritaet, LeadStage, QualiErgebnis, SalesErgebnis } from '@/types/database'

const LEAD_STAGE_VALUES = akquiseDomain.LEAD_STAGE_VALUES as unknown as [string, ...string[]]
const LEAD_PRIORITAET_VALUES = akquiseDomain.LEAD_PRIORITAET_VALUES as unknown as [string, ...string[]]
const AKQUISE_ERGEBNIS_VALUES = akquiseDomain.AKQUISE_ERGEBNIS_VALUES as unknown as [string, ...string[]]
const QUALI_ERGEBNIS_VALUES = akquiseDomain.QUALI_ERGEBNIS_VALUES as unknown as [string, ...string[]]
const SALES_ERGEBNIS_VALUES = akquiseDomain.SALES_ERGEBNIS_VALUES as unknown as [string, ...string[]]
const CLIENT_STATUS_VALUES = ['lead', 'pending', 'active', 'paused', 'inactive', 'completed'] as const

// ── list_contact_submissions ─────────────────────────────────────────────────

const listContactSubmissions = defineTool({
  slug: 'list_contact_submissions',
  label: 'Kontaktanfragen auflisten',
  description: 'Listet Kontaktanfragen aus dem Website-Kontaktformular, nach Datum sortiert (neueste zuerst).',
  requiresConfirmation: false,
  schema: z.object({
    include_read: z
      .boolean()
      .optional()
      .describe('Auch bereits gelesene Anfragen einbeziehen. Default: false (nur unbearbeitete).'),
  }),
  async execute(args) {
    return akquiseDomain.listContactSubmissions({ includeRead: args.include_read === true })
  },
})

// ── list_leads ──────────────────────────────────────────────────────────────

const listLeads = defineTool({
  slug: 'list_leads',
  label: 'Leads auflisten',
  description: 'Listet Leads, optional gefiltert nach Funnel-Stage, Priorität, Quelle, fälliger Wiedervorlage oder Firmenname (Suche).',
  requiresConfirmation: false,
  schema: z.object({
    current_stage: z.enum(LEAD_STAGE_VALUES).optional().describe('Optionaler Filter nach Funnel-Stage.'),
    prioritaet: z.enum(LEAD_PRIORITAET_VALUES).optional().describe('Optionaler Filter nach Priorität.'),
    quelle: z.string().optional().describe("Optionaler Filter nach Quelle, z.B. 'KI', 'Google', 'Netzwerk' (optional)."),
    wiedervorlage_faellig: z.boolean().optional().describe('Nur Leads mit Wiedervorlage heute oder früher (optional).'),
    search: z.string().optional().describe('Freitextsuche über den Firmennamen (optional).'),
  }),
  async execute(args) {
    return akquiseDomain.listLeads({
      currentStage: (args.current_stage as LeadStage | undefined) ?? undefined,
      prioritaet: (args.prioritaet as LeadPrioritaet | undefined) ?? undefined,
      quelle: args.quelle,
      wiedervorlageDue: args.wiedervorlage_faellig === true,
      search: args.search,
    })
  },
})

// ── get_lead ────────────────────────────────────────────────────────────────

const getLead = defineTool({
  slug: 'get_lead',
  label: 'Lead abrufen',
  description: 'Liefert einen Lead mit allen Funnel-Daten (Quali-Call und Sales-Call, falls vorhanden).',
  requiresConfirmation: false,
  schema: z.object({
    lead_id: z.string().describe('UUID des Leads (leads.id).'),
  }),
  async execute(args) {
    return akquiseDomain.getLead(args.lead_id)
  },
})

// ── create_lead ─────────────────────────────────────────────────────────────

const createLead = defineTool({
  slug: 'create_lead',
  label: 'Lead anlegen',
  description: 'Legt einen neuen Lead an und vergibt automatisch die nächste L-Nummer.',
  requiresConfirmation: false,
  schema: z.object({
    firmenname: z.string().min(1).describe('Firmenname des Leads.'),
    ansprechpartner: z.string().optional().describe('Name der Kontaktperson (optional).'),
    position: z.string().optional().describe('Position der Kontaktperson (optional).'),
    zielgruppe: z.string().optional().describe('Freitext-Kategorie, z.B. "Coaches & Berater" (optional).'),
    stadt: z.string().optional().describe('Stadt (optional).'),
    website: z.string().optional().describe('Website-URL (optional).'),
    phone: z.string().optional().describe('Telefonnummer (optional).'),
    email: z.string().optional().describe('E-Mail-Adresse (optional).'),
    quelle: z.string().optional().describe("Herkunft, z.B. 'KI', 'Google', 'Netzwerk', 'Website', 'Empfehlung' (optional)."),
    website_qualitaet: z
      .string()
      .optional()
      .describe("z.B. 'Sehr schlecht', 'Schlecht', 'Ausbaufähig', 'OK', 'Gut', 'Keine Website' (optional)."),
    prioritaet: z.enum(LEAD_PRIORITAET_VALUES).optional().describe("Priorität, Default 'medium'."),
    notizen: z.string().optional().describe('Interne Notizen (optional).'),
  }),
  async execute(args) {
    return akquiseDomain.createLead({
      firmenname: args.firmenname,
      ansprechpartner: args.ansprechpartner ?? null,
      position: args.position ?? null,
      zielgruppe: args.zielgruppe ?? null,
      stadt: args.stadt ?? null,
      website: args.website ?? null,
      phone: args.phone ?? null,
      email: args.email ?? null,
      quelle: args.quelle ?? null,
      websiteQualitaet: args.website_qualitaet ?? null,
      prioritaet: (args.prioritaet as LeadPrioritaet | undefined) ?? undefined,
      notizen: args.notizen ?? null,
    })
  },
})

// ── update_lead ─────────────────────────────────────────────────────────────

const updateLead = defineTool({
  slug: 'update_lead',
  label: 'Lead aktualisieren',
  description: 'Aktualisiert Felder eines bestehenden Leads (z.B. akquise_ergebnis, wiedervorlage, notizen).',
  requiresConfirmation: false,
  schema: z.object({
    lead_id: z.string().describe('UUID des Leads (leads.id).'),
    firmenname: z.string().optional(),
    ansprechpartner: z.string().optional(),
    position: z.string().optional(),
    zielgruppe: z.string().optional(),
    stadt: z.string().optional(),
    website: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    quelle: z.string().optional(),
    website_qualitaet: z.string().optional(),
    prioritaet: z.enum(LEAD_PRIORITAET_VALUES).optional(),
    erstkontakt_am: z.string().optional().describe('Format YYYY-MM-DD.'),
    akquise_ergebnis: z.enum(AKQUISE_ERGEBNIS_VALUES).optional(),
    wiedervorlage: z.string().optional().describe('Format YYYY-MM-DD.'),
    notizen: z.string().optional(),
    current_stage: z.enum(LEAD_STAGE_VALUES).optional(),
  }),
  async execute(args) {
    return akquiseDomain.updateLead(args.lead_id, {
      firmenname: args.firmenname ?? undefined,
      ansprechpartner: args.ansprechpartner ?? null,
      position: args.position ?? null,
      zielgruppe: args.zielgruppe ?? null,
      stadt: args.stadt ?? null,
      website: args.website ?? null,
      phone: args.phone ?? null,
      email: args.email ?? null,
      quelle: args.quelle ?? null,
      website_qualitaet: args.website_qualitaet ?? null,
      prioritaet: (args.prioritaet as LeadPrioritaet | undefined) ?? undefined,
      erstkontakt_am: args.erstkontakt_am ?? null,
      akquise_ergebnis: (args.akquise_ergebnis as AkquiseErgebnis | undefined) ?? undefined,
      wiedervorlage: args.wiedervorlage ?? null,
      notizen: args.notizen ?? null,
      current_stage: (args.current_stage as LeadStage | undefined) ?? undefined,
    })
  },
})

// ── add_quali_call ──────────────────────────────────────────────────────────

const addQualiCall = defineTool({
  slug: 'add_quali_call',
  label: 'Quali-Call erfassen',
  description: 'Legt einen Quali-Call-Eintrag für einen Lead an und setzt dessen Stage auf quali_call.',
  requiresConfirmation: false,
  schema: z.object({
    lead_id: z.string().describe('UUID des Leads (leads.id).'),
    quali_call_am: z.string().optional().describe('Datum des Calls, Format YYYY-MM-DD (optional).'),
    quali_ergebnis: z.enum(QUALI_ERGEBNIS_VALUES).optional().describe("Ergebnis des Calls, Default 'offen'."),
    wiedervorlage: z.string().optional().describe('Wiedervorlage-Datum, Format YYYY-MM-DD (optional).'),
    bedarf_notizen: z.string().optional().describe('Notizen zum ermittelten Bedarf (optional).'),
  }),
  async execute(args) {
    return akquiseDomain.addQualiCall(args.lead_id, {
      qualiCallAm: args.quali_call_am ?? null,
      qualiErgebnis: (args.quali_ergebnis as QualiErgebnis | undefined) ?? undefined,
      wiedervorlage: args.wiedervorlage ?? null,
      bedarfNotizen: args.bedarf_notizen ?? null,
    })
  },
})

// ── add_sales_call ──────────────────────────────────────────────────────────

const addSalesCall = defineTool({
  slug: 'add_sales_call',
  label: 'Sales-Call erfassen',
  description: 'Legt einen Sales-/Closing-Call-Eintrag für einen Lead an und setzt dessen Stage auf closing_call.',
  requiresConfirmation: false,
  schema: z.object({
    lead_id: z.string().describe('UUID des Leads (leads.id).'),
    closing_call_am: z.string().optional().describe('Datum des Calls, Format YYYY-MM-DD (optional).'),
    leistungen: z.string().optional().describe('Besprochene Leistungen (optional).'),
    angebotsvolumen: z.number().optional().describe('Angebotsvolumen in Euro (optional).'),
    leistungsbeginn: z.string().optional().describe('Geplanter Leistungsbeginn, Format YYYY-MM-DD (optional).'),
    sales_ergebnis: z.enum(SALES_ERGEBNIS_VALUES).optional().describe("Ergebnis des Calls, Default 'offen'."),
    notizen: z.string().optional().describe('Notizen (optional).'),
  }),
  async execute(args) {
    return akquiseDomain.addSalesCall(args.lead_id, {
      closingCallAm: args.closing_call_am ?? null,
      leistungen: args.leistungen ?? null,
      angebotsvolumen: args.angebotsvolumen ?? null,
      leistungsbeginn: args.leistungsbeginn ?? null,
      salesErgebnis: (args.sales_ergebnis as SalesErgebnis | undefined) ?? undefined,
      notizen: args.notizen ?? null,
    })
  },
})

// ── convert_lead_to_client ────────────────────────────────────────────────────

const convertLeadToClient = defineTool({
  slug: 'convert_lead_to_client',
  label: 'Lead in Kunde umwandeln',
  description:
    'Wandelt einen gewonnenen Lead in einen Kunden um: legt den Kunden an, vergibt die KD-Nummer und verknüpft ' +
    'den Lead. Sendet standardmäßig KEINE Portal-Einladung. Nur mit send_invite:true wird sofort eine echte ' +
    'Einladungs-E-Mail versendet (dafür ist email dann Pflicht). Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    lead_id: z.string().describe('UUID des Leads (leads.id).'),
    email: z
      .string()
      .optional()
      .describe('E-Mail-Adresse (optional, Default: die beim Lead hinterlegte E-Mail). Mit send_invite:true Pflicht.'),
    send_invite: z.boolean().optional().describe('Ob sofort eine Portal-Einladungs-E-Mail versendet wird. Default: false.'),
    status: z.enum(CLIENT_STATUS_VALUES).optional().describe("Kundenstatus des neuen Kunden, Default 'pending'."),
  }),
  summarize: (args) =>
    `Lead ${args.lead_id} in Kunde umwandeln${args.send_invite ? ' und sofort per E-Mail einladen' : ''}.`,
  async execute(args) {
    return akquiseDomain.convertLeadToClient(args.lead_id, {
      email: args.email,
      sendInvite: args.send_invite === true,
      status: (args.status as ClientStatus | undefined) ?? undefined,
    })
  },
})

// ── create_offer ────────────────────────────────────────────────────────────

const offerItemSchema = z.object({
  art_nr: z.string().optional().describe('Artikelnummer (optional, falls Position auf einen Katalogartikel verweist).'),
  pkt_nr: z.string().optional().describe('Paketnummer (optional, falls Position ein ganzes Paket ist).'),
  bezeichnung: z.string().optional().describe('Freitext-Bezeichnung, überschreibt Artikel-/Paketname (optional).'),
  menge: z.number().optional().describe('Menge, Default 1.'),
  ep: z.number().describe('Einzelpreis (Festpreis innerhalb der Katalog-Preisspanne).'),
})

const createOffer = defineTool({
  slug: 'create_offer',
  label: 'Angebot erstellen',
  description:
    'Erstellt ein Angebot (Entwurf) aus Artikeln/Paketen und vergibt sofort die AN-Nummer. ' +
    'Der Festpreis je Position (ep) muss innerhalb der Katalog-Preisspanne gewählt und explizit angegeben werden — ' +
    'noch keine PDF-Erzeugung (folgt in Phase 5).',
  requiresConfirmation: false,
  schema: z.object({
    lead_id: z.string().optional().describe('UUID des Leads (optional, falls Angebot an einen Lead geht).'),
    client_id: z.string().optional().describe('UUID des Kunden (optional, falls Angebot an einen Bestandskunden geht).'),
    valid_until: z.string().optional().describe('Gültig bis, Format YYYY-MM-DD (optional).'),
    items: z.array(offerItemSchema).min(1).describe('Angebotspositionen.'),
  }),
  async execute(args) {
    return akquiseDomain.createOffer({
      leadId: args.lead_id ?? null,
      clientId: args.client_id ?? null,
      validUntil: args.valid_until ?? null,
      items: args.items.map((item) => ({
        artNr: item.art_nr,
        pktNr: item.pkt_nr,
        bezeichnung: item.bezeichnung,
        menge: item.menge,
        ep: item.ep,
      })),
    })
  },
})

// ── draft_followup_email ──────────────────────────────────────────────────────

const draftFollowupEmail = defineTool({
  slug: 'draft_followup_email',
  label: 'Follow-Up-E-Mail entwerfen',
  description: 'Verfasst einen Follow-Up-E-Mail-Entwurf für einen Lead (nur Text, kein Versand — send_followup_email folgt erst in Phase 5).',
  requiresConfirmation: false,
  schema: z.object({
    lead_id: z.string().describe('UUID des Leads (leads.id).'),
    anlass: z.string().optional().describe('Anlass/Kontext für den Follow-Up, z.B. "nach Quali-Call" (optional).'),
  }),
  async execute(args) {
    return akquiseDomain.draftFollowupEmail(args.lead_id, args.anlass ?? null)
  },
})

// ── send_followup_email ────────────────────────────────────────────────────

const sendFollowupEmail = defineTool({
  slug: 'send_followup_email',
  label: 'Follow-Up-E-Mail versenden',
  description:
    'Verfasst und versendet direkt eine Follow-Up-E-Mail an den Lead (nutzt draft_followup_email intern) und ' +
    'protokolliert den Versand in den Lead-Notizen. Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    lead_id: z.string().describe('UUID des Leads (leads.id).'),
    anlass: z.string().optional().describe('Anlass/Kontext für den Follow-Up, z.B. "nach Quali-Call" (optional).'),
  }),
  summarize: (args) => `Follow-Up-E-Mail an Lead ${args.lead_id} versenden${args.anlass ? ` (Anlass: ${args.anlass})` : ''}.`,
  async execute(args) {
    return akquiseDomain.sendFollowupEmail(args.lead_id, args.anlass ?? null)
  },
})

// ── set_wiedervorlage ─────────────────────────────────────────────────────────

const setWiedervorlage = defineTool({
  slug: 'set_wiedervorlage',
  label: 'Wiedervorlage setzen',
  description: 'Setzt das Wiedervorlage-Datum eines Leads und legt automatisch ein zugehöriges Todo an.',
  requiresConfirmation: false,
  schema: z.object({
    lead_id: z.string().describe('UUID des Leads (leads.id).'),
    wiedervorlage: z.string().describe('Wiedervorlage-Datum, Format YYYY-MM-DD.'),
    notiz: z.string().optional().describe('Kurzer Hinweis für das Todo (optional).'),
  }),
  async execute(args) {
    return akquiseDomain.setWiedervorlage(args.lead_id, args.wiedervorlage, args.notiz ?? null)
  },
})

// ── log_akquise_tracking ──────────────────────────────────────────────────────

const logAkquiseTracking = defineTool({
  slug: 'log_akquise_tracking',
  label: 'Akquise-Tracking erfassen',
  description:
    'Trägt tägliche Kalt-Akquise-Aktivitäten ein (Wählversuche, Gespräche, Termine). Werte werden zum jeweiligen Tag addiert, nicht überschrieben.',
  requiresConfirmation: false,
  schema: z.object({
    datum: z.string().optional().describe('Datum, Format YYYY-MM-DD. Default: heute.'),
    waehlversuche: z.number().optional().describe('Anzahl Wählversuche (optional).'),
    gespraeche_empfang: z.number().optional().describe('Gespräche mit Empfang/Zentrale (optional).'),
    gespraeche_entscheider: z.number().optional().describe('Gespräche mit Entscheider (optional).'),
    termine_vereinbart: z.number().optional().describe('Vereinbarte Termine (optional).'),
  }),
  async execute(args) {
    return akquiseDomain.logAkquiseTracking({
      datum: args.datum,
      waehlversuche: args.waehlversuche,
      gespraecheEmpfang: args.gespraeche_empfang,
      gespraecheEntscheider: args.gespraeche_entscheider,
      termineVereinbart: args.termine_vereinbart,
    })
  },
})

// ── get_funnel_stats ──────────────────────────────────────────────────────────

const getFunnelStats = defineTool({
  slug: 'get_funnel_stats',
  label: 'Funnel-Statistik abrufen',
  description: 'Berechnet Funnel-Verteilung und Konversionsraten zwischen den Stages aus allen Leads.',
  requiresConfirmation: false,
  schema: z.object({}),
  async execute() {
    return akquiseDomain.getFunnelStats()
  },
})

// ── get_akquise_sync_status ──────────────────────────────────────────────────

const getAkquiseSyncStatus = defineTool({
  slug: 'get_akquise_sync_status',
  label: 'Sync-Status abrufen',
  description:
    'Zeigt Zeitpunkt und Ergebnis des letzten Google-Sheet-Syncs der Akquise-Daten (Leads/Calls/Tracking) — ' +
    'inklusive Warnungen wie nicht zuordenbare Sheet-Werte.',
  requiresConfirmation: false,
  schema: z.object({}),
  async execute() {
    const [lastSyncedAt, lastSync] = await Promise.all([
      akquiseDomain.getLastSheetSyncAt(),
      akquiseDomain.getLastSyncMessage(),
    ])
    return { last_synced_at: lastSyncedAt, last_sync_success: lastSync?.success ?? null, last_sync_message: lastSync?.message ?? null }
  },
})

// ── sync_akquise_sheet ────────────────────────────────────────────────────────

const syncAkquiseSheet = defineTool({
  slug: 'sync_akquise_sheet',
  label: 'Akquise-Sheet synchronisieren',
  description:
    'Zieht Leads, Quali-/Sales-Calls und Tages-Tracking frisch aus dem Akquise-Google-Sheet und gleicht sie mit ' +
    'der Datenbank ab (dieselbe Aktion wie der "Sheet synchronisieren"-Button in /admin/akquise). Erfordert ' +
    'Bestätigung, da es Leads/Calls/Tracking in der Datenbank verändert.',
  requiresConfirmation: true,
  schema: z.object({}),
  summarize: () => 'Akquise-Daten frisch aus dem Google-Sheet synchronisieren (verändert Leads/Calls/Tracking in der DB).',
  async execute() {
    return syncAkquiseFromSheet()
  },
})

export const akquiseTools: HelmToolDef[] = [
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
