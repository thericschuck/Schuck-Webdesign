import { z } from 'zod'
import { defineTool, type HelmToolDef } from '../types'
import * as figma from '@/lib/integrations/figma'
import * as github from '@/lib/integrations/github'
import * as vercel from '@/lib/integrations/vercel'
import * as gsc from '@/lib/integrations/gsc'
import * as pagespeed from '@/lib/integrations/pagespeed'
import * as uptime from '@/lib/integrations/uptime'
import * as vapi from '@/lib/integrations/vapi'
import * as gbp from '@/lib/integrations/gbp'
import * as calendar from '@/lib/integrations/calendar'
import * as domain from '@/lib/integrations/domain'

// ── figma_get_design_context ────────────────────────────────────────────────

const figmaGetDesignContext = defineTool({
  slug: 'figma_get_design_context',
  label: 'Figma-Design-Kontext lesen',
  description:
    'Liest den Design-Kontext einer Figma-Datei: Seiten, Frame-Anzahl, optional Details zu einem konkreten Node. ' +
    'Nur verfügbar, wenn FIGMA_ACCESS_TOKEN konfiguriert ist.',
  requiresConfirmation: false,
  schema: z.object({
    file_key: z.string().describe('Figma-Datei-Key (aus der Figma-URL, z.B. .../file/ABCdef123/...).'),
    node_id: z.string().optional().describe('Optionale Node-ID für Details zu einem konkreten Frame/Element.'),
  }),
  async execute(args) {
    return figma.getDesignContext(args.file_key, args.node_id)
  },
})

// ── figma_get_screenshot ─────────────────────────────────────────────────────

const figmaGetScreenshot = defineTool({
  slug: 'figma_get_screenshot',
  label: 'Figma-Screenshot exportieren',
  description:
    'Exportiert einen Figma-Node als Bild und liefert eine (zeitlich begrenzt gültige) URL zum Öffnen. ' +
    'Nur verfügbar, wenn FIGMA_ACCESS_TOKEN konfiguriert ist.',
  requiresConfirmation: false,
  schema: z.object({
    file_key: z.string().describe('Figma-Datei-Key.'),
    node_id: z.string().describe('Node-ID des zu exportierenden Frames/Elements.'),
    format: z.enum(['png', 'svg']).optional().describe('Export-Format, Default png.'),
  }),
  async execute(args) {
    return figma.getScreenshot(args.file_key, args.node_id, args.format === 'svg' ? 'svg' : 'png')
  },
})

// ── figma_post_comment (⚠ Bestätigung) ──────────────────────────────────────

const figmaPostComment = defineTool({
  slug: 'figma_post_comment',
  label: 'Figma-Kommentar posten',
  description:
    'Postet einen Kommentar auf einer Figma-Datei (z.B. Design-Feedback), sichtbar für alle Bearbeiter der Datei. ' +
    'Ohne node_id wird der Kommentar am Seitenursprung gepinnt. Nur verfügbar, wenn FIGMA_ACCESS_TOKEN den Scope ' +
    'file_comments:write hat. Erfordert Bestätigung, da für andere sichtbar.',
  requiresConfirmation: true,
  schema: z.object({
    file_key: z.string().describe('Figma-Datei-Key.'),
    message: z.string().describe('Kommentartext.'),
    node_id: z.string().optional().describe('Node, an den der Kommentar gepinnt wird (optional).'),
    reply_to_comment_id: z.string().optional().describe('Antwort auf einen bestehenden Kommentar (optional).'),
  }),
  summarize: (args) => `Kommentar auf Figma-Datei ${args.file_key} posten: "${args.message}"`,
  async execute(args) {
    return figma.postComment(args.file_key, args.message, {
      nodeId: args.node_id,
      replyToCommentId: args.reply_to_comment_id,
    })
  },
})

// ── figma_delete_comment (⚠ Bestätigung) ────────────────────────────────────

const figmaDeleteComment = defineTool({
  slug: 'figma_delete_comment',
  label: 'Figma-Kommentar löschen',
  description: 'Löscht einen Kommentar auf einer Figma-Datei unwiderruflich. Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    file_key: z.string().describe('Figma-Datei-Key.'),
    comment_id: z.string().describe('UUID des Kommentars.'),
  }),
  summarize: (args) => `Kommentar ${args.comment_id} auf Figma-Datei ${args.file_key} unwiderruflich löschen.`,
  async execute(args) {
    await figma.deleteComment(args.file_key, args.comment_id)
    return { deleted: true }
  },
})

// ── figma_create_dev_resource (⚠ Bestätigung) ───────────────────────────────

const figmaCreateDevResource = defineTool({
  slug: 'figma_create_dev_resource',
  label: 'Figma-Dev-Resource anlegen',
  description:
    'Hängt im Dev-Mode einen Link (z.B. Jira-Ticket, Doku) an einen Figma-Node an. Nur verfügbar, wenn ' +
    'FIGMA_ACCESS_TOKEN den Scope file_dev_resources:write hat. Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    file_key: z.string().describe('Figma-Datei-Key.'),
    node_id: z.string().describe('Node, an den der Link angehängt wird.'),
    name: z.string().describe('Anzeigename des Links.'),
    url: z.string().describe('Ziel-URL.'),
  }),
  summarize: (args) => `Dev-Mode-Link "${args.name}" (${args.url}) an Figma-Node ${args.node_id} anhängen.`,
  async execute(args) {
    return figma.createDevResource(args.file_key, args.node_id, args.name, args.url)
  },
})

// ── figma_delete_dev_resource (⚠ Bestätigung) ───────────────────────────────

const figmaDeleteDevResource = defineTool({
  slug: 'figma_delete_dev_resource',
  label: 'Figma-Dev-Resource entfernen',
  description: 'Entfernt einen Dev-Mode-Link von einem Figma-Node. Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    file_key: z.string().describe('Figma-Datei-Key.'),
    dev_resource_id: z.string().describe('ID der Dev-Resource.'),
  }),
  summarize: (args) => `Dev-Mode-Link ${args.dev_resource_id} von Figma-Datei ${args.file_key} entfernen.`,
  async execute(args) {
    await figma.deleteDevResource(args.file_key, args.dev_resource_id)
    return { deleted: true }
  },
})

// ── figma_get_variables ──────────────────────────────────────────────────────

const figmaGetVariables = defineTool({
  slug: 'figma_get_variables',
  label: 'Figma-Variablen lesen',
  description:
    'Liest lokale Variablen (Farben, Spacing, etc.) einer Figma-Datei. Nur auf Figma-Enterprise-Plänen verfügbar — ' +
    'auf anderen Plänen meldet Figma einen Fehler.',
  requiresConfirmation: false,
  schema: z.object({
    file_key: z.string().describe('Figma-Datei-Key.'),
  }),
  async execute(args) {
    return figma.getVariables(args.file_key)
  },
})

// ── figma_update_variable_value (⚠ Bestätigung) ─────────────────────────────

const figmaUpdateVariableValue = defineTool({
  slug: 'figma_update_variable_value',
  label: 'Figma-Variablenwert setzen',
  description:
    'Setzt den Wert einer Figma-Variable für einen bestimmten Mode (z.B. "Light"). Nur auf Figma-Enterprise-Plänen ' +
    'verfügbar. Ruf vorher figma_get_variables auf, um variable_id/mode_id/Werttyp zu ermitteln — bei Typ COLOR ' +
    'ist value ein Objekt {r,g,b,a} mit Werten 0-1, bei FLOAT eine Zahl, sonst der Wert direkt. Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    file_key: z.string().describe('Figma-Datei-Key.'),
    variable_id: z.string().describe('ID der Variable (aus figma_get_variables).'),
    mode_id: z.string().describe('ID des Modes (aus figma_get_variables, valuesByMode-Keys).'),
    value: z.any().describe('Neuer Wert, Form hängt vom Variablentyp ab (siehe Beschreibung).'),
  }),
  summarize: (args) => `Figma-Variable ${args.variable_id} (Mode ${args.mode_id}) in Datei ${args.file_key} neu setzen.`,
  async execute(args) {
    await figma.updateVariableValue(args.file_key, args.variable_id, args.mode_id, args.value)
    return { updated: true }
  },
})

// ── github_get_repo_status ──────────────────────────────────────────────────

const githubGetRepoStatus = defineTool({
  slug: 'github_get_repo_status',
  label: 'GitHub-Repo-Status lesen',
  description:
    'Liefert Repo-Status (Default-Branch, offene Issues, letzter Push, archiviert?) für ein GitHub-Repo. ' +
    'Nur verfügbar, wenn GITHUB_TOKEN konfiguriert ist.',
  requiresConfirmation: false,
  schema: z.object({
    owner: z.string().describe('GitHub-Organisation/-Nutzername.'),
    repo: z.string().describe('Repo-Name.'),
  }),
  async execute(args) {
    return github.getRepoStatus(args.owner, args.repo)
  },
})

// ── github_list_issues ───────────────────────────────────────────────────────

const githubListIssues = defineTool({
  slug: 'github_list_issues',
  label: 'GitHub-Issues auflisten',
  description: 'Listet Issues eines GitHub-Repos (ohne Pull Requests). Nur verfügbar, wenn GITHUB_TOKEN konfiguriert ist.',
  requiresConfirmation: false,
  schema: z.object({
    owner: z.string().describe('GitHub-Organisation/-Nutzername.'),
    repo: z.string().describe('Repo-Name.'),
    state: z.enum(['open', 'closed', 'all']).optional().describe('Default: open.'),
  }),
  async execute(args) {
    return github.listIssues(args.owner, args.repo, args.state ?? 'open')
  },
})

// ── github_get_file ───────────────────────────────────────────────────────────

const githubGetFile = defineTool({
  slug: 'github_get_file',
  label: 'GitHub-Datei lesen',
  description: 'Liest den Inhalt einer Datei aus einem GitHub-Repo. Nur verfügbar, wenn GITHUB_TOKEN konfiguriert ist.',
  requiresConfirmation: false,
  schema: z.object({
    owner: z.string().describe('GitHub-Organisation/-Nutzername.'),
    repo: z.string().describe('Repo-Name.'),
    path: z.string().describe('Pfad zur Datei im Repo, z.B. "package.json".'),
    ref: z.string().optional().describe('Branch/Tag/Commit (optional, Default: Default-Branch).'),
  }),
  async execute(args) {
    return github.getFile(args.owner, args.repo, args.path, args.ref)
  },
})

// ── vercel_get_deployment_status ────────────────────────────────────────────

const vercelGetDeploymentStatus = defineTool({
  slug: 'vercel_get_deployment_status',
  label: 'Vercel-Deployment-Status lesen',
  description:
    'Liefert den neuesten Deployment-Status (READY/ERROR/BUILDING, URL, Zeitpunkt) eines Vercel-Projekts. ' +
    'Nur verfügbar, wenn VERCEL_API_TOKEN konfiguriert ist.',
  requiresConfirmation: false,
  schema: z.object({
    project: z.string().describe('Vercel-Projekt-ID oder -Name.'),
  }),
  async execute(args) {
    return vercel.getDeploymentStatus(args.project)
  },
})

// ── gsc_get_performance ──────────────────────────────────────────────────────

const gscGetPerformance = defineTool({
  slug: 'gsc_get_performance',
  label: 'Search-Console-Performance lesen',
  description:
    'Liefert die Top-10-Suchanfragen (Klicks, Impressionen, CTR, Position) einer Search-Console-Property. ' +
    'Default-Zeitraum: letzte 28 Tage. Nur verfügbar, wenn GSC_REFRESH_TOKEN konfiguriert ist.',
  requiresConfirmation: false,
  schema: z.object({
    site_url: z.string().describe('Search-Console-Property, z.B. "https://kunde.de/" oder "sc-domain:kunde.de".'),
    from_date: z.string().optional().describe('Format YYYY-MM-DD (optional).'),
    to_date: z.string().optional().describe('Format YYYY-MM-DD (optional).'),
  }),
  async execute(args) {
    return gsc.getPerformance(args.site_url, args.from_date, args.to_date)
  },
})

// ── pagespeed_check ──────────────────────────────────────────────────────────

const pagespeedCheck = defineTool({
  slug: 'pagespeed_check',
  label: 'PageSpeed-Check ausführen',
  description:
    'Prüft Performance-Score und Core Web Vitals (LCP, CLS, TBT, FCP) einer URL via PageSpeed Insights. ' +
    'Nur verfügbar, wenn PAGESPEED_API_KEY konfiguriert ist.',
  requiresConfirmation: false,
  schema: z.object({
    url: z.string().describe('Zu prüfende URL, z.B. "https://kunde.de".'),
    strategy: z.enum(['mobile', 'desktop']).optional().describe('Default: mobile.'),
  }),
  async execute(args) {
    return pagespeed.check(args.url, args.strategy === 'desktop' ? 'desktop' : 'mobile')
  },
})

// ── uptime_get_status / uptime_get_incidents ────────────────────────────────

const uptimeGetStatus = defineTool({
  slug: 'uptime_get_status',
  label: 'Uptime-Status lesen',
  description:
    'Liefert den aktuellen Uptime-Status (up/down/paused, 30-Tage-Uptime-Quote) einer überwachten Website. ' +
    'Nur verfügbar, wenn UPTIMEROBOT_API_KEY konfiguriert ist.',
  requiresConfirmation: false,
  schema: z.object({
    search: z.string().describe('Domain oder Monitor-Name zur Suche, z.B. "kunde.de".'),
  }),
  async execute(args) {
    return uptime.getStatus(args.search)
  },
})

const uptimeGetIncidents = defineTool({
  slug: 'uptime_get_incidents',
  label: 'Uptime-Incidents lesen',
  description: 'Liefert die letzten Down/Up-Incidents einer überwachten Website. Nur verfügbar, wenn UPTIMEROBOT_API_KEY konfiguriert ist.',
  requiresConfirmation: false,
  schema: z.object({
    search: z.string().describe('Domain oder Monitor-Name zur Suche.'),
    limit: z.number().optional().describe('Max. Anzahl Einträge, Default 10.'),
  }),
  async execute(args) {
    return uptime.getIncidents(args.search, args.limit)
  },
})

// ── vapi_get_call_logs / vapi_get_stats ─────────────────────────────────────

const vapiGetCallLogs = defineTool({
  slug: 'vapi_get_call_logs',
  label: 'Telefonbot-Calls auflisten',
  description: 'Listet die letzten Telefonbot-Calls (Zeitpunkt, Dauer, Ende-Grund, Kosten, Zusammenfassung). Nur verfügbar, wenn VAPI_API_KEY konfiguriert ist.',
  requiresConfirmation: false,
  schema: z.object({
    assistant_id: z.string().optional().describe('Vapi-Assistant-ID (optional, filtert auf einen Bot).'),
    limit: z.number().optional().describe('Max. Anzahl Calls, Default 20.'),
  }),
  async execute(args) {
    return vapi.getCallLogs(args.limit, args.assistant_id)
  },
})

const vapiGetStats = defineTool({
  slug: 'vapi_get_stats',
  label: 'Telefonbot-Statistiken abrufen',
  description:
    'Aggregiert Statistiken über die letzten Telefonbot-Calls (Gesamtanzahl, Kosten, Ø-Dauer, Ende-Gründe). ' +
    'Nur verfügbar, wenn VAPI_API_KEY konfiguriert ist.',
  requiresConfirmation: false,
  schema: z.object({
    assistant_id: z.string().optional().describe('Vapi-Assistant-ID (optional, filtert auf einen Bot).'),
    sample_size: z.number().optional().describe('Wie viele der letzten Calls einbezogen werden, Default 100.'),
  }),
  async execute(args) {
    return vapi.getStats(args.assistant_id, args.sample_size)
  },
})

// ── gbp_get_reviews ──────────────────────────────────────────────────────────

const gbpGetReviews = defineTool({
  slug: 'gbp_get_reviews',
  label: 'Google-Business-Bewertungen lesen',
  description:
    'Liefert Kundenbewertungen (Ø-Bewertung, Anzahl, letzte Reviews mit Antwort-Status) für ein Google-Business-Profile. ' +
    'Ohne Angaben werden die Default-Account/Location aus der Konfiguration verwendet. Nur verfügbar, wenn GBP_* konfiguriert ist.',
  requiresConfirmation: false,
  schema: z.object({
    account_id: z.string().optional().describe('Business-Profile-Account-ID (optional, Default aus Konfiguration).'),
    location_id: z.string().optional().describe('Business-Profile-Location-ID (optional, Default aus Konfiguration).'),
  }),
  async execute(args) {
    return gbp.getReviews(args.account_id, args.location_id)
  },
})

// ── calendar_check_availability ─────────────────────────────────────────────

const calendarCheckAvailability = defineTool({
  slug: 'calendar_check_availability',
  label: 'Kalender-Verfügbarkeit prüfen',
  description:
    'Prüft, ob im angegebenen Zeitraum bereits Termine im Google-Kalender liegen (Free/Busy). ' +
    'Nur verfügbar, wenn GOOGLE_CALENDAR_REFRESH_TOKEN konfiguriert ist.',
  requiresConfirmation: false,
  schema: z.object({
    from: z.string().describe('Start des Zeitraums, ISO 8601 (z.B. "2026-07-10T09:00:00+02:00").'),
    to: z.string().describe('Ende des Zeitraums, ISO 8601.'),
    calendar_id: z.string().optional().describe('Kalender-ID, Default "primary".'),
  }),
  async execute(args) {
    return calendar.checkAvailability(args.from, args.to, args.calendar_id)
  },
})

// ── domain_get_expiry / domain_list_dns_records ─────────────────────────────

const domainGetExpiry = defineTool({
  slug: 'domain_get_expiry',
  label: 'Domain-Ablaufdatum lesen',
  description:
    'Liefert das Ablaufdatum einer Domain (nur für über Cloudflare Registrar registrierte Domains, nicht für nur ' +
    'DNS-verwaltete). Nur verfügbar, wenn CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID konfiguriert sind.',
  requiresConfirmation: false,
  schema: z.object({
    domain: z.string().describe('Domain, z.B. "kunde.de".'),
  }),
  async execute(args) {
    return domain.getExpiry(args.domain)
  },
})

const domainListDnsRecords = defineTool({
  slug: 'domain_list_dns_records',
  label: 'DNS-Records auflisten',
  description: 'Listet DNS-Records einer bei Cloudflare verwalteten Domain. Nur verfügbar, wenn CLOUDFLARE_API_TOKEN konfiguriert ist.',
  requiresConfirmation: false,
  schema: z.object({
    domain: z.string().describe('Domain, z.B. "kunde.de".'),
  }),
  async execute(args) {
    return domain.listDnsRecords(args.domain)
  },
})

// ── calendar_create_event (⚠ Bestätigung) ───────────────────────────────────

const calendarCreateEvent = defineTool({
  slug: 'calendar_create_event',
  label: 'Kalendertermin anlegen',
  description:
    'Legt einen Termin im Google-Kalender an (z.B. Wiedervorlage, Meeting). Nur verfügbar, wenn ' +
    'GOOGLE_CALENDAR_REFRESH_TOKEN konfiguriert ist. Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    summary: z.string().describe('Titel des Termins.'),
    description: z.string().optional().describe('Beschreibung (optional).'),
    start: z.string().describe('Start, ISO 8601 (z.B. "2026-07-10T09:00:00+02:00").'),
    end: z.string().describe('Ende, ISO 8601.'),
    calendar_id: z.string().optional().describe('Kalender-ID, Default "primary".'),
    attendee_emails: z.array(z.string()).optional().describe('Optionale Teilnehmer-E-Mails.'),
  }),
  summarize: (args) => `Kalendertermin "${args.summary}" (${args.start} – ${args.end}) anlegen.`,
  async execute(args) {
    return calendar.createEvent({
      summary: args.summary,
      description: args.description,
      startISO: args.start,
      endISO: args.end,
      calendarId: args.calendar_id,
      attendeeEmails: args.attendee_emails,
    })
  },
})

// ── domain_renew (⚠ Bestätigung) ────────────────────────────────────────────

const domainRenew = defineTool({
  slug: 'domain_renew',
  label: 'Domain-Auto-Renew aktivieren',
  description:
    'Aktiviert Auto-Renew für eine über Cloudflare Registrar registrierte Domain (Cloudflare bietet keine ' +
    'sofortige manuelle Verlängerung — Auto-Renew greift automatisch vor Ablauf). Nur verfügbar, wenn ' +
    'CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID konfiguriert sind. Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    domain: z.string().describe('Domain, z.B. "kunde.de".'),
  }),
  summarize: (args) => `Auto-Renew für Domain ${args.domain} aktivieren.`,
  async execute(args) {
    return domain.renew(args.domain)
  },
})

export const integrationTools: HelmToolDef[] = [
  figmaGetDesignContext,
  figmaGetScreenshot,
  figmaPostComment,
  figmaDeleteComment,
  figmaCreateDevResource,
  figmaDeleteDevResource,
  figmaGetVariables,
  figmaUpdateVariableValue,
  githubGetRepoStatus,
  githubListIssues,
  githubGetFile,
  vercelGetDeploymentStatus,
  gscGetPerformance,
  pagespeedCheck,
  uptimeGetStatus,
  uptimeGetIncidents,
  vapiGetCallLogs,
  vapiGetStats,
  gbpGetReviews,
  calendarCheckAvailability,
  domainGetExpiry,
  domainListDnsRecords,
  calendarCreateEvent,
  domainRenew,
]
