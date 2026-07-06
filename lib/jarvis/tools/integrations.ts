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

export const integrationTools: JarvisTool[] = [
  figmaGetDesignContext,
  figmaGetScreenshot,
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
]
