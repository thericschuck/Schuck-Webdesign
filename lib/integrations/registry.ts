export interface TokenExpiry {
  /**
   * Key in integration_settings (service = descriptor.service, key = dieser Wert) mit dem
   * Ausstellungsdatum des Tokens, Format YYYY-MM-DD — editierbar über /admin/integrationen,
   * bewusst NICHT in .env.local (kein Secret, soll ohne Server-Neustart setzbar sein).
   */
  settingKey: string
  /** Feste Gültigkeitsdauer des Tokens in Tagen ab Ausstellung (z.B. Figma: 90). */
  validDays: number
}

export interface IntegrationDescriptor {
  service: string
  label: string
  envVars: string[]
  /** True, wenn ALLE benötigten Env-Vars gesetzt sind. */
  isConfigured: () => boolean
  /** Nur für Dienste mit bekannter, fester Token-Laufzeit (z.B. Figma Personal Access Tokens: 90 Tage). */
  expiry?: TokenExpiry
}

function hasEnv(...names: string[]): boolean {
  return names.every((name) => Boolean(process.env[name]?.trim()))
}

export interface ExpiryStatus {
  expiresAt: Date
  daysRemaining: number
  status: 'ok' | 'warning' | 'expired' | 'unknown'
}

const EXPIRY_WARNING_THRESHOLD_DAYS = 14

/**
 * Berechnet Ablaufdatum + verbleibende Tage für Dienste mit `expiry`-Angabe, anhand vorher via
 * getIntegrationSettings() geladener Werte (Key-Format "service:settingKey"). "unknown" heißt:
 * Laufzeit ist bekannt, aber das Ausstellungsdatum wurde noch nicht eingetragen — kein Alarm,
 * nur "kann nicht berechnet werden". Gibt null zurück, wenn der Dienst gar keine feste
 * Token-Laufzeit hat (Feld `expiry` nicht gesetzt).
 */
export function getExpiryStatus(descriptor: IntegrationDescriptor, settings: Map<string, string>): ExpiryStatus | null {
  if (!descriptor.expiry) return null

  const issuedAtRaw = settings.get(`${descriptor.service}:${descriptor.expiry.settingKey}`)?.trim()
  const issuedAt = issuedAtRaw ? new Date(issuedAtRaw) : null
  if (!issuedAt || Number.isNaN(issuedAt.getTime())) {
    return { expiresAt: new Date(NaN), daysRemaining: NaN, status: 'unknown' }
  }

  const expiresAt = new Date(issuedAt.getTime() + descriptor.expiry.validDays * 24 * 60 * 60 * 1000)
  const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  const status = daysRemaining < 0 ? 'expired' : daysRemaining <= EXPIRY_WARNING_THRESHOLD_DAYS ? 'warning' : 'ok'

  return { expiresAt, daysRemaining, status }
}

/**
 * Statischer Katalog aller externen Dienste aus Bereich 7 — Grundlage für
 * /admin/integrationen (Konfiguriert?) und für isConfigured()-Checks in den
 * einzelnen lib/integrations/*.ts-Modulen (dieselbe hasEnv()-Logik).
 */
export const INTEGRATIONS: IntegrationDescriptor[] = [
  {
    service: 'figma',
    label: 'Figma',
    envVars: ['FIGMA_ACCESS_TOKEN'],
    isConfigured: () => hasEnv('FIGMA_ACCESS_TOKEN'),
    expiry: { settingKey: 'token_issued_at', validDays: 90 },
  },
  {
    service: 'github',
    label: 'GitHub',
    envVars: ['GITHUB_TOKEN'],
    isConfigured: () => hasEnv('GITHUB_TOKEN'),
  },
  {
    service: 'vercel',
    label: 'Vercel',
    envVars: ['VERCEL_API_TOKEN'],
    isConfigured: () => hasEnv('VERCEL_API_TOKEN'),
  },
  {
    service: 'gsc',
    label: 'Google Search Console',
    envVars: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GSC_REFRESH_TOKEN'],
    isConfigured: () => hasEnv('GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GSC_REFRESH_TOKEN'),
  },
  {
    service: 'pagespeed',
    label: 'PageSpeed Insights',
    envVars: ['PAGESPEED_API_KEY'],
    isConfigured: () => hasEnv('PAGESPEED_API_KEY'),
  },
  {
    service: 'uptime',
    label: 'UptimeRobot',
    envVars: ['UPTIMEROBOT_API_KEY'],
    isConfigured: () => hasEnv('UPTIMEROBOT_API_KEY'),
  },
  {
    service: 'vapi',
    label: 'Vapi.ai',
    envVars: ['VAPI_API_KEY'],
    isConfigured: () => hasEnv('VAPI_API_KEY'),
  },
  {
    service: 'gbp',
    label: 'Google Business Profile',
    envVars: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GBP_REFRESH_TOKEN', 'GBP_ACCOUNT_ID', 'GBP_LOCATION_ID'],
    isConfigured: () =>
      hasEnv('GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GBP_REFRESH_TOKEN', 'GBP_ACCOUNT_ID', 'GBP_LOCATION_ID'),
  },
  {
    service: 'calendar',
    label: 'Google Calendar',
    envVars: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_CALENDAR_REFRESH_TOKEN'],
    isConfigured: () => hasEnv('GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_CALENDAR_REFRESH_TOKEN'),
  },
  {
    service: 'domain',
    label: 'Domain (Cloudflare)',
    envVars: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'],
    isConfigured: () => hasEnv('CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'),
  },
  {
    service: 'sheets',
    label: 'Google Sheets (Akquise)',
    envVars: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'SHEETS_REFRESH_TOKEN', 'AKQUISE_SPREADSHEET_ID'],
    isConfigured: () =>
      hasEnv('GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'SHEETS_REFRESH_TOKEN', 'AKQUISE_SPREADSHEET_ID'),
  },
  {
    service: 'email',
    label: 'E-Mail (Resend)',
    envVars: ['RESEND_API_KEY'],
    isConfigured: () => hasEnv('RESEND_API_KEY'),
  },
]
