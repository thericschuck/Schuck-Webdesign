import * as uptime from '@/lib/integrations/uptime'
import * as pagespeed from '@/lib/integrations/pagespeed'
import * as gsc from '@/lib/integrations/gsc'
import * as vapi from '@/lib/integrations/vapi'
import * as gbp from '@/lib/integrations/gbp'

export interface CareReportSection<T> {
  available: boolean
  reason?: string
  data?: T
}

export interface CareReportData {
  month: string
  uptime: CareReportSection<{ status: string; uptimeRatio30d: string | null }>
  performance: CareReportSection<{ score: number | null; lcp: string | null; cls: string | null }>
  seo: CareReportSection<{ rows: { keys: string[]; clicks: number; impressions: number }[] }>
  callBot: CareReportSection<{ totalCalls: number; totalCost: number; averageDurationSeconds: number | null }>
  reviews: CareReportSection<{ averageRating: number | null; totalReviewCount: number }>
}

async function safeSection<T>(reasonIfMissing: string | null, fn: () => Promise<T>): Promise<CareReportSection<T>> {
  if (reasonIfMissing) return { available: false, reason: reasonIfMissing }
  try {
    const data = await fn()
    return { available: true, data }
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : 'Unbekannter Fehler' }
  }
}

/**
 * Sammelt die Kennzahlen für den monatlichen Care-Report eines Kunden. Läuft komplett auf "graceful
 * degradation": ein nicht konfigurierter oder fehlgeschlagener Dienst blockiert die anderen Abschnitte
 * nicht — jeder Abschnitt trägt seinen eigenen Verfügbarkeits-/Fehlerstatus für das PDF-Template.
 *
 * Vapi/GBP haben kein Konzept für "ein Assistant/eine Location pro Kunde" in unserer DB — sie nutzen die
 * global konfigurierte Default-Ressource (ein Vapi-Assistant, eine GBP-Location), nicht pro Kunde gefiltert.
 */
export async function gatherCareReportData(website: string | null, month: string): Promise<CareReportData> {
  const noWebsiteReason = website ? null : 'Kein Website-Feld beim Kunden hinterlegt.'

  const [uptimeSection, performanceSection, seoSection, callBotSection, reviewsSection] = await Promise.all([
    safeSection(noWebsiteReason, async () => {
      const status = await uptime.getStatus(website!)
      if (!status) throw new Error('Kein Uptime-Monitor für diese Domain gefunden.')
      return { status: status.status, uptimeRatio30d: status.uptimeRatio30d }
    }),
    safeSection(noWebsiteReason, async () => {
      const result = await pagespeed.check(website!.startsWith('http') ? website! : `https://${website}`)
      return { score: result.performanceScore, lcp: result.coreWebVitals.largestContentfulPaint, cls: result.coreWebVitals.cumulativeLayoutShift }
    }),
    safeSection(noWebsiteReason, async () => {
      const result = await gsc.getPerformance(website!.startsWith('http') ? website! : `https://${website}/`)
      return { rows: result.rows.map((row) => ({ keys: row.keys, clicks: row.clicks, impressions: row.impressions })) }
    }),
    safeSection(null, async () => {
      const stats = await vapi.getStats()
      return { totalCalls: stats.totalCalls, totalCost: stats.totalCost, averageDurationSeconds: stats.averageDurationSeconds }
    }),
    safeSection(null, async () => {
      const result = await gbp.getReviews()
      return { averageRating: result.averageRating, totalReviewCount: result.totalReviewCount }
    }),
  ])

  return { month, uptime: uptimeSection, performance: performanceSection, seo: seoSection, callBot: callBotSection, reviews: reviewsSection }
}
