import { IntegrationError } from './errors'
import { logIntegrationCall } from './log'

const SERVICE = 'pagespeed'
const API_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

export function isConfigured(): boolean {
  return Boolean(process.env.PAGESPEED_API_KEY?.trim())
}

function requireKey(): string {
  const key = process.env.PAGESPEED_API_KEY
  if (!key) throw new IntegrationError(SERVICE, 'missing_key', 'PAGESPEED_API_KEY ist nicht konfiguriert.')
  return key
}

export interface PageSpeedResult {
  url: string
  strategy: 'mobile' | 'desktop'
  performanceScore: number | null
  coreWebVitals: {
    largestContentfulPaint: string | null
    cumulativeLayoutShift: string | null
    totalBlockingTime: string | null
    firstContentfulPaint: string | null
  }
}

export async function check(url: string, strategy: 'mobile' | 'desktop' = 'mobile'): Promise<PageSpeedResult> {
  try {
    const key = requireKey()
    const params = new URLSearchParams({ url, key, strategy, category: 'performance' })
    const response = await fetch(`${API_BASE}?${params.toString()}`)

    if (response.status === 401 || response.status === 403) {
      throw new IntegrationError(SERVICE, 'unauthorized', 'PAGESPEED_API_KEY ist ungültig oder ohne Berechtigung.')
    }
    if (!response.ok) {
      throw new IntegrationError(SERVICE, 'upstream_error', `PageSpeed-API-Fehler (${response.status}).`)
    }

    const data = (await response.json()) as {
      lighthouseResult?: {
        categories?: { performance?: { score?: number } }
        audits?: Record<string, { displayValue?: string }>
      }
    }
    const audits = data.lighthouseResult?.audits ?? {}
    const scoreRaw = data.lighthouseResult?.categories?.performance?.score

    const result: PageSpeedResult = {
      url,
      strategy,
      performanceScore: typeof scoreRaw === 'number' ? Math.round(scoreRaw * 100) : null,
      coreWebVitals: {
        largestContentfulPaint: audits['largest-contentful-paint']?.displayValue ?? null,
        cumulativeLayoutShift: audits['cumulative-layout-shift']?.displayValue ?? null,
        totalBlockingTime: audits['total-blocking-time']?.displayValue ?? null,
        firstContentfulPaint: audits['first-contentful-paint']?.displayValue ?? null,
      },
    }
    await logIntegrationCall(SERVICE, true)
    return result
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}
