import type { JarvisTool } from '../tool-types'
import { optionalNumber, optionalString, requireString } from './helpers'
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

const figmaGetDesignContext: JarvisTool = {
  name: 'figma_get_design_context',
  requiresConfirmation: false,
  definition: {
    name: 'figma_get_design_context',
    description:
      'Liest den Design-Kontext einer Figma-Datei: Seiten, Frame-Anzahl, optional Details zu einem konkreten Node. ' +
      'Nur verfügbar, wenn FIGMA_ACCESS_TOKEN konfiguriert ist.',
    input_schema: {
      type: 'object',
      properties: {
        file_key: { type: 'string', description: 'Figma-Datei-Key (aus der Figma-URL, z.B. .../file/ABCdef123/...).' },
        node_id: { type: 'string', description: 'Optionale Node-ID für Details zu einem konkreten Frame/Element.' },
      },
      required: ['file_key'],
    },
  },
  async execute(args) {
    return figma.getDesignContext(requireString(args, 'file_key'), optionalString(args, 'node_id') ?? undefined)
  },
}

// ── figma_get_screenshot ─────────────────────────────────────────────────────

const figmaGetScreenshot: JarvisTool = {
  name: 'figma_get_screenshot',
  requiresConfirmation: false,
  definition: {
    name: 'figma_get_screenshot',
    description:
      'Exportiert einen Figma-Node als Bild und liefert eine (zeitlich begrenzt gültige) URL zum Öffnen. ' +
      'Nur verfügbar, wenn FIGMA_ACCESS_TOKEN konfiguriert ist.',
    input_schema: {
      type: 'object',
      properties: {
        file_key: { type: 'string', description: 'Figma-Datei-Key.' },
        node_id: { type: 'string', description: 'Node-ID des zu exportierenden Frames/Elements.' },
        format: { type: 'string', enum: ['png', 'svg'], description: 'Export-Format, Default png.' },
      },
      required: ['file_key', 'node_id'],
    },
  },
  async execute(args) {
    const format = optionalString(args, 'format')
    return figma.getScreenshot(
      requireString(args, 'file_key'),
      requireString(args, 'node_id'),
      format === 'svg' ? 'svg' : 'png'
    )
  },
}

// ── figma_post_comment (⚠ Bestätigung) ──────────────────────────────────────

const figmaPostComment: JarvisTool = {
  name: 'figma_post_comment',
  requiresConfirmation: true,
  definition: {
    name: 'figma_post_comment',
    description:
      'Postet einen Kommentar auf einer Figma-Datei (z.B. Design-Feedback), sichtbar für alle Bearbeiter der Datei. ' +
      'Ohne node_id wird der Kommentar am Seitenursprung gepinnt. Nur verfügbar, wenn FIGMA_ACCESS_TOKEN den Scope ' +
      'file_comments:write hat. Erfordert Bestätigung, da für andere sichtbar.',
    input_schema: {
      type: 'object',
      properties: {
        file_key: { type: 'string', description: 'Figma-Datei-Key.' },
        message: { type: 'string', description: 'Kommentartext.' },
        node_id: { type: 'string', description: 'Node, an den der Kommentar gepinnt wird (optional).' },
        reply_to_comment_id: { type: 'string', description: 'Antwort auf einen bestehenden Kommentar (optional).' },
      },
      required: ['file_key', 'message'],
    },
  },
  async execute(args) {
    return figma.postComment(requireString(args, 'file_key'), requireString(args, 'message'), {
      nodeId: optionalString(args, 'node_id') ?? undefined,
      replyToCommentId: optionalString(args, 'reply_to_comment_id') ?? undefined,
    })
  },
}

// ── figma_delete_comment (⚠ Bestätigung) ────────────────────────────────────

const figmaDeleteComment: JarvisTool = {
  name: 'figma_delete_comment',
  requiresConfirmation: true,
  definition: {
    name: 'figma_delete_comment',
    description: 'Löscht einen Kommentar auf einer Figma-Datei unwiderruflich. Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        file_key: { type: 'string', description: 'Figma-Datei-Key.' },
        comment_id: { type: 'string', description: 'UUID des Kommentars.' },
      },
      required: ['file_key', 'comment_id'],
    },
  },
  async execute(args) {
    await figma.deleteComment(requireString(args, 'file_key'), requireString(args, 'comment_id'))
    return { deleted: true }
  },
}

// ── figma_create_dev_resource (⚠ Bestätigung) ───────────────────────────────

const figmaCreateDevResource: JarvisTool = {
  name: 'figma_create_dev_resource',
  requiresConfirmation: true,
  definition: {
    name: 'figma_create_dev_resource',
    description:
      'Hängt im Dev-Mode einen Link (z.B. Jira-Ticket, Doku) an einen Figma-Node an. Nur verfügbar, wenn ' +
      'FIGMA_ACCESS_TOKEN den Scope file_dev_resources:write hat. Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        file_key: { type: 'string', description: 'Figma-Datei-Key.' },
        node_id: { type: 'string', description: 'Node, an den der Link angehängt wird.' },
        name: { type: 'string', description: 'Anzeigename des Links.' },
        url: { type: 'string', description: 'Ziel-URL.' },
      },
      required: ['file_key', 'node_id', 'name', 'url'],
    },
  },
  async execute(args) {
    return figma.createDevResource(
      requireString(args, 'file_key'),
      requireString(args, 'node_id'),
      requireString(args, 'name'),
      requireString(args, 'url')
    )
  },
}

// ── figma_delete_dev_resource (⚠ Bestätigung) ───────────────────────────────

const figmaDeleteDevResource: JarvisTool = {
  name: 'figma_delete_dev_resource',
  requiresConfirmation: true,
  definition: {
    name: 'figma_delete_dev_resource',
    description: 'Entfernt einen Dev-Mode-Link von einem Figma-Node. Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        file_key: { type: 'string', description: 'Figma-Datei-Key.' },
        dev_resource_id: { type: 'string', description: 'ID der Dev-Resource.' },
      },
      required: ['file_key', 'dev_resource_id'],
    },
  },
  async execute(args) {
    await figma.deleteDevResource(requireString(args, 'file_key'), requireString(args, 'dev_resource_id'))
    return { deleted: true }
  },
}

// ── figma_get_variables ──────────────────────────────────────────────────────

const figmaGetVariables: JarvisTool = {
  name: 'figma_get_variables',
  requiresConfirmation: false,
  definition: {
    name: 'figma_get_variables',
    description:
      'Liest lokale Variablen (Farben, Spacing, etc.) einer Figma-Datei. Nur auf Figma-Enterprise-Plänen verfügbar — ' +
      'auf anderen Plänen meldet Figma einen Fehler.',
    input_schema: {
      type: 'object',
      properties: {
        file_key: { type: 'string', description: 'Figma-Datei-Key.' },
      },
      required: ['file_key'],
    },
  },
  async execute(args) {
    return figma.getVariables(requireString(args, 'file_key'))
  },
}

// ── figma_update_variable_value (⚠ Bestätigung) ─────────────────────────────

const figmaUpdateVariableValue: JarvisTool = {
  name: 'figma_update_variable_value',
  requiresConfirmation: true,
  definition: {
    name: 'figma_update_variable_value',
    description:
      'Setzt den Wert einer Figma-Variable für einen bestimmten Mode (z.B. "Light"). Nur auf Figma-Enterprise-Plänen ' +
      'verfügbar. Ruf vorher figma_get_variables auf, um variable_id/mode_id/Werttyp zu ermitteln — bei Typ COLOR ' +
      'ist value ein Objekt {r,g,b,a} mit Werten 0-1, bei FLOAT eine Zahl, sonst der Wert direkt. Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        file_key: { type: 'string', description: 'Figma-Datei-Key.' },
        variable_id: { type: 'string', description: 'ID der Variable (aus figma_get_variables).' },
        mode_id: { type: 'string', description: 'ID des Modes (aus figma_get_variables, valuesByMode-Keys).' },
        value: { description: 'Neuer Wert, Form hängt vom Variablentyp ab (siehe Beschreibung).' },
      },
      required: ['file_key', 'variable_id', 'mode_id', 'value'],
    },
  },
  async execute(args) {
    return figma.updateVariableValue(requireString(args, 'file_key'), requireString(args, 'variable_id'), requireString(args, 'mode_id'), args.value)
      .then(() => ({ updated: true }))
  },
}

// ── github_get_repo_status ──────────────────────────────────────────────────

const githubGetRepoStatus: JarvisTool = {
  name: 'github_get_repo_status',
  requiresConfirmation: false,
  definition: {
    name: 'github_get_repo_status',
    description:
      'Liefert Repo-Status (Default-Branch, offene Issues, letzter Push, archiviert?) für ein GitHub-Repo. ' +
      'Nur verfügbar, wenn GITHUB_TOKEN konfiguriert ist.',
    input_schema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub-Organisation/-Nutzername.' },
        repo: { type: 'string', description: 'Repo-Name.' },
      },
      required: ['owner', 'repo'],
    },
  },
  async execute(args) {
    return github.getRepoStatus(requireString(args, 'owner'), requireString(args, 'repo'))
  },
}

// ── github_list_issues ───────────────────────────────────────────────────────

const githubListIssues: JarvisTool = {
  name: 'github_list_issues',
  requiresConfirmation: false,
  definition: {
    name: 'github_list_issues',
    description: 'Listet Issues eines GitHub-Repos (ohne Pull Requests). Nur verfügbar, wenn GITHUB_TOKEN konfiguriert ist.',
    input_schema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub-Organisation/-Nutzername.' },
        repo: { type: 'string', description: 'Repo-Name.' },
        state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Default: open.' },
      },
      required: ['owner', 'repo'],
    },
  },
  async execute(args) {
    const state = optionalString(args, 'state')
    return github.listIssues(
      requireString(args, 'owner'),
      requireString(args, 'repo'),
      state === 'closed' || state === 'all' ? state : 'open'
    )
  },
}

// ── github_get_file ───────────────────────────────────────────────────────────

const githubGetFile: JarvisTool = {
  name: 'github_get_file',
  requiresConfirmation: false,
  definition: {
    name: 'github_get_file',
    description: 'Liest den Inhalt einer Datei aus einem GitHub-Repo. Nur verfügbar, wenn GITHUB_TOKEN konfiguriert ist.',
    input_schema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub-Organisation/-Nutzername.' },
        repo: { type: 'string', description: 'Repo-Name.' },
        path: { type: 'string', description: 'Pfad zur Datei im Repo, z.B. "package.json".' },
        ref: { type: 'string', description: 'Branch/Tag/Commit (optional, Default: Default-Branch).' },
      },
      required: ['owner', 'repo', 'path'],
    },
  },
  async execute(args) {
    return github.getFile(
      requireString(args, 'owner'),
      requireString(args, 'repo'),
      requireString(args, 'path'),
      optionalString(args, 'ref') ?? undefined
    )
  },
}

// ── vercel_get_deployment_status ────────────────────────────────────────────

const vercelGetDeploymentStatus: JarvisTool = {
  name: 'vercel_get_deployment_status',
  requiresConfirmation: false,
  definition: {
    name: 'vercel_get_deployment_status',
    description:
      'Liefert den neuesten Deployment-Status (READY/ERROR/BUILDING, URL, Zeitpunkt) eines Vercel-Projekts. ' +
      'Nur verfügbar, wenn VERCEL_API_TOKEN konfiguriert ist.',
    input_schema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Vercel-Projekt-ID oder -Name.' },
      },
      required: ['project'],
    },
  },
  async execute(args) {
    return vercel.getDeploymentStatus(requireString(args, 'project'))
  },
}

// ── gsc_get_performance ──────────────────────────────────────────────────────

const gscGetPerformance: JarvisTool = {
  name: 'gsc_get_performance',
  requiresConfirmation: false,
  definition: {
    name: 'gsc_get_performance',
    description:
      'Liefert die Top-10-Suchanfragen (Klicks, Impressionen, CTR, Position) einer Search-Console-Property. ' +
      'Default-Zeitraum: letzte 28 Tage. Nur verfügbar, wenn GSC_REFRESH_TOKEN konfiguriert ist.',
    input_schema: {
      type: 'object',
      properties: {
        site_url: { type: 'string', description: 'Search-Console-Property, z.B. "https://kunde.de/" oder "sc-domain:kunde.de".' },
        from_date: { type: 'string', description: 'Format YYYY-MM-DD (optional).' },
        to_date: { type: 'string', description: 'Format YYYY-MM-DD (optional).' },
      },
      required: ['site_url'],
    },
  },
  async execute(args) {
    return gsc.getPerformance(
      requireString(args, 'site_url'),
      optionalString(args, 'from_date') ?? undefined,
      optionalString(args, 'to_date') ?? undefined
    )
  },
}

// ── pagespeed_check ──────────────────────────────────────────────────────────

const pagespeedCheck: JarvisTool = {
  name: 'pagespeed_check',
  requiresConfirmation: false,
  definition: {
    name: 'pagespeed_check',
    description:
      'Prüft Performance-Score und Core Web Vitals (LCP, CLS, TBT, FCP) einer URL via PageSpeed Insights. ' +
      'Nur verfügbar, wenn PAGESPEED_API_KEY konfiguriert ist.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Zu prüfende URL, z.B. "https://kunde.de".' },
        strategy: { type: 'string', enum: ['mobile', 'desktop'], description: 'Default: mobile.' },
      },
      required: ['url'],
    },
  },
  async execute(args) {
    const strategy = optionalString(args, 'strategy')
    return pagespeed.check(requireString(args, 'url'), strategy === 'desktop' ? 'desktop' : 'mobile')
  },
}

// ── uptime_get_status / uptime_get_incidents ────────────────────────────────

const uptimeGetStatus: JarvisTool = {
  name: 'uptime_get_status',
  requiresConfirmation: false,
  definition: {
    name: 'uptime_get_status',
    description:
      'Liefert den aktuellen Uptime-Status (up/down/paused, 30-Tage-Uptime-Quote) einer überwachten Website. ' +
      'Nur verfügbar, wenn UPTIMEROBOT_API_KEY konfiguriert ist.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Domain oder Monitor-Name zur Suche, z.B. "kunde.de".' },
      },
      required: ['search'],
    },
  },
  async execute(args) {
    return uptime.getStatus(requireString(args, 'search'))
  },
}

const uptimeGetIncidents: JarvisTool = {
  name: 'uptime_get_incidents',
  requiresConfirmation: false,
  definition: {
    name: 'uptime_get_incidents',
    description: 'Liefert die letzten Down/Up-Incidents einer überwachten Website. Nur verfügbar, wenn UPTIMEROBOT_API_KEY konfiguriert ist.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Domain oder Monitor-Name zur Suche.' },
        limit: { type: 'number', description: 'Max. Anzahl Einträge, Default 10.' },
      },
      required: ['search'],
    },
  },
  async execute(args) {
    return uptime.getIncidents(requireString(args, 'search'), optionalNumber(args, 'limit') ?? undefined)
  },
}

// ── vapi_get_call_logs / vapi_get_stats ─────────────────────────────────────

const vapiGetCallLogs: JarvisTool = {
  name: 'vapi_get_call_logs',
  requiresConfirmation: false,
  definition: {
    name: 'vapi_get_call_logs',
    description: 'Listet die letzten Telefonbot-Calls (Zeitpunkt, Dauer, Ende-Grund, Kosten, Zusammenfassung). Nur verfügbar, wenn VAPI_API_KEY konfiguriert ist.',
    input_schema: {
      type: 'object',
      properties: {
        assistant_id: { type: 'string', description: 'Vapi-Assistant-ID (optional, filtert auf einen Bot).' },
        limit: { type: 'number', description: 'Max. Anzahl Calls, Default 20.' },
      },
    },
  },
  async execute(args) {
    return vapi.getCallLogs(optionalNumber(args, 'limit') ?? undefined, optionalString(args, 'assistant_id') ?? undefined)
  },
}

const vapiGetStats: JarvisTool = {
  name: 'vapi_get_stats',
  requiresConfirmation: false,
  definition: {
    name: 'vapi_get_stats',
    description:
      'Aggregiert Statistiken über die letzten Telefonbot-Calls (Gesamtanzahl, Kosten, Ø-Dauer, Ende-Gründe). ' +
      'Nur verfügbar, wenn VAPI_API_KEY konfiguriert ist.',
    input_schema: {
      type: 'object',
      properties: {
        assistant_id: { type: 'string', description: 'Vapi-Assistant-ID (optional, filtert auf einen Bot).' },
        sample_size: { type: 'number', description: 'Wie viele der letzten Calls einbezogen werden, Default 100.' },
      },
    },
  },
  async execute(args) {
    return vapi.getStats(optionalString(args, 'assistant_id') ?? undefined, optionalNumber(args, 'sample_size') ?? undefined)
  },
}

// ── gbp_get_reviews ──────────────────────────────────────────────────────────

const gbpGetReviews: JarvisTool = {
  name: 'gbp_get_reviews',
  requiresConfirmation: false,
  definition: {
    name: 'gbp_get_reviews',
    description:
      'Liefert Kundenbewertungen (Ø-Bewertung, Anzahl, letzte Reviews mit Antwort-Status) für ein Google-Business-Profile. ' +
      'Ohne Angaben werden die Default-Account/Location aus der Konfiguration verwendet. Nur verfügbar, wenn GBP_* konfiguriert ist.',
    input_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Business-Profile-Account-ID (optional, Default aus Konfiguration).' },
        location_id: { type: 'string', description: 'Business-Profile-Location-ID (optional, Default aus Konfiguration).' },
      },
    },
  },
  async execute(args) {
    return gbp.getReviews(optionalString(args, 'account_id') ?? undefined, optionalString(args, 'location_id') ?? undefined)
  },
}

// ── calendar_check_availability ─────────────────────────────────────────────

const calendarCheckAvailability: JarvisTool = {
  name: 'calendar_check_availability',
  requiresConfirmation: false,
  definition: {
    name: 'calendar_check_availability',
    description:
      'Prüft, ob im angegebenen Zeitraum bereits Termine im Google-Kalender liegen (Free/Busy). ' +
      'Nur verfügbar, wenn GOOGLE_CALENDAR_REFRESH_TOKEN konfiguriert ist.',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Start des Zeitraums, ISO 8601 (z.B. "2026-07-10T09:00:00+02:00").' },
        to: { type: 'string', description: 'Ende des Zeitraums, ISO 8601.' },
        calendar_id: { type: 'string', description: 'Kalender-ID, Default "primary".' },
      },
      required: ['from', 'to'],
    },
  },
  async execute(args) {
    return calendar.checkAvailability(requireString(args, 'from'), requireString(args, 'to'), optionalString(args, 'calendar_id') ?? undefined)
  },
}

// ── domain_get_expiry / domain_list_dns_records ─────────────────────────────

const domainGetExpiry: JarvisTool = {
  name: 'domain_get_expiry',
  requiresConfirmation: false,
  definition: {
    name: 'domain_get_expiry',
    description:
      'Liefert das Ablaufdatum einer Domain (nur für über Cloudflare Registrar registrierte Domains, nicht für nur ' +
      'DNS-verwaltete). Nur verfügbar, wenn CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID konfiguriert sind.',
    input_schema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain, z.B. "kunde.de".' },
      },
      required: ['domain'],
    },
  },
  async execute(args) {
    return domain.getExpiry(requireString(args, 'domain'))
  },
}

const domainListDnsRecords: JarvisTool = {
  name: 'domain_list_dns_records',
  requiresConfirmation: false,
  definition: {
    name: 'domain_list_dns_records',
    description: 'Listet DNS-Records einer bei Cloudflare verwalteten Domain. Nur verfügbar, wenn CLOUDFLARE_API_TOKEN konfiguriert ist.',
    input_schema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain, z.B. "kunde.de".' },
      },
      required: ['domain'],
    },
  },
  async execute(args) {
    return domain.listDnsRecords(requireString(args, 'domain'))
  },
}

// ── calendar_create_event (⚠ Bestätigung) ───────────────────────────────────

const calendarCreateEvent: JarvisTool = {
  name: 'calendar_create_event',
  requiresConfirmation: true,
  definition: {
    name: 'calendar_create_event',
    description:
      'Legt einen Termin im Google-Kalender an (z.B. Wiedervorlage, Meeting). Nur verfügbar, wenn ' +
      'GOOGLE_CALENDAR_REFRESH_TOKEN konfiguriert ist. Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Titel des Termins.' },
        description: { type: 'string', description: 'Beschreibung (optional).' },
        start: { type: 'string', description: 'Start, ISO 8601 (z.B. "2026-07-10T09:00:00+02:00").' },
        end: { type: 'string', description: 'Ende, ISO 8601.' },
        calendar_id: { type: 'string', description: 'Kalender-ID, Default "primary".' },
        attendee_emails: { type: 'array', items: { type: 'string' }, description: 'Optionale Teilnehmer-E-Mails.' },
      },
      required: ['summary', 'start', 'end'],
    },
  },
  async execute(args) {
    const attendees = args.attendee_emails
    return calendar.createEvent({
      summary: requireString(args, 'summary'),
      description: optionalString(args, 'description') ?? undefined,
      startISO: requireString(args, 'start'),
      endISO: requireString(args, 'end'),
      calendarId: optionalString(args, 'calendar_id') ?? undefined,
      attendeeEmails: Array.isArray(attendees) ? attendees.filter((e): e is string => typeof e === 'string') : undefined,
    })
  },
}

// ── domain_renew (⚠ Bestätigung) ────────────────────────────────────────────

const domainRenew: JarvisTool = {
  name: 'domain_renew',
  requiresConfirmation: true,
  definition: {
    name: 'domain_renew',
    description:
      'Aktiviert Auto-Renew für eine über Cloudflare Registrar registrierte Domain (Cloudflare bietet keine ' +
      'sofortige manuelle Verlängerung — Auto-Renew greift automatisch vor Ablauf). Nur verfügbar, wenn ' +
      'CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID konfiguriert sind. Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain, z.B. "kunde.de".' },
      },
      required: ['domain'],
    },
  },
  async execute(args) {
    return domain.renew(requireString(args, 'domain'))
  },
}

export const integrationTools: JarvisTool[] = [
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
