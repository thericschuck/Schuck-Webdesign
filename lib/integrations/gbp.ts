import { IntegrationError } from './errors'
import { logIntegrationCall } from './log'
import { getGoogleAccessToken } from './google-oauth'

const SERVICE = 'gbp'
const API_BASE = 'https://mybusiness.googleapis.com/v4'

const STAR_RATING_VALUES: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }

export function isConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() &&
      process.env.GBP_REFRESH_TOKEN?.trim() &&
      process.env.GBP_ACCOUNT_ID?.trim() &&
      process.env.GBP_LOCATION_ID?.trim()
  )
}

interface GbpReview {
  reviewId: string
  reviewer?: { displayName?: string }
  starRating?: string
  comment?: string
  createTime?: string
  reviewReply?: unknown
}

export interface ReviewSummary {
  reviewer: string
  rating: number | null
  comment: string | null
  createdAt: string | null
  hasReply: boolean
}

export interface ReviewsResult {
  averageRating: number | null
  totalReviewCount: number
  reviews: ReviewSummary[]
}

/** Liefert die letzten Bewertungen einer Business-Profile-Location. Nutzt GBP_ACCOUNT_ID/GBP_LOCATION_ID, falls nicht übergeben. */
export async function getReviews(accountId?: string, locationId?: string): Promise<ReviewsResult> {
  try {
    if (!isConfigured()) {
      throw new IntegrationError(SERVICE, 'missing_key', 'GBP_REFRESH_TOKEN/GOOGLE_OAUTH_CLIENT_ID/SECRET/GBP_ACCOUNT_ID/GBP_LOCATION_ID ist nicht konfiguriert.')
    }
    const account = accountId ?? process.env.GBP_ACCOUNT_ID!
    const location = locationId ?? process.env.GBP_LOCATION_ID!

    const accessToken = await getGoogleAccessToken(SERVICE, process.env.GBP_REFRESH_TOKEN!)
    const response = await fetch(`${API_BASE}/accounts/${encodeURIComponent(account)}/locations/${encodeURIComponent(location)}/reviews`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (response.status === 401 || response.status === 403) {
      throw new IntegrationError(SERVICE, 'unauthorized', 'GBP-Zugriff verweigert — Location nicht mit dem Account verknüpft oder Token ungültig.')
    }
    if (!response.ok) {
      throw new IntegrationError(SERVICE, 'upstream_error', `Business-Profile-API-Fehler (${response.status}).`)
    }

    const data = (await response.json()) as { averageRating?: number; totalReviewCount?: number; reviews?: GbpReview[] }
    const result: ReviewsResult = {
      averageRating: data.averageRating ?? null,
      totalReviewCount: data.totalReviewCount ?? 0,
      reviews: (data.reviews ?? []).map((review) => ({
        reviewer: review.reviewer?.displayName ?? 'Anonym',
        rating: review.starRating ? (STAR_RATING_VALUES[review.starRating] ?? null) : null,
        comment: review.comment ?? null,
        createdAt: review.createTime ?? null,
        hasReply: Boolean(review.reviewReply),
      })),
    }
    await logIntegrationCall(SERVICE, true)
    return result
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}
