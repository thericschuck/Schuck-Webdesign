export interface IntegrationDescriptor {
  service: string
  label: string
  envVars: string[]
  /** True, wenn ALLE benötigten Env-Vars gesetzt sind. */
  isConfigured: () => boolean
}

function hasEnv(...names: string[]): boolean {
  return names.every((name) => Boolean(process.env[name]?.trim()))
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
    envVars: ['CLOUDFLARE_API_TOKEN'],
    isConfigured: () => hasEnv('CLOUDFLARE_API_TOKEN'),
  },
]
