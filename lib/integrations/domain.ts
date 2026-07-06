import { IntegrationError } from './errors'
import { logIntegrationCall } from './log'

const SERVICE = 'domain'
const API_BASE = 'https://api.cloudflare.com/client/v4'

export function isConfigured(): boolean {
  return Boolean(process.env.CLOUDFLARE_API_TOKEN?.trim())
}

function requireToken(): string {
  const token = process.env.CLOUDFLARE_API_TOKEN
  if (!token) throw new IntegrationError(SERVICE, 'missing_key', 'CLOUDFLARE_API_TOKEN ist nicht konfiguriert.')
  return token
}

function requireAccountId(): string {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  if (!accountId) throw new IntegrationError(SERVICE, 'missing_key', 'CLOUDFLARE_ACCOUNT_ID ist nicht konfiguriert.')
  return accountId
}

async function cloudflareFetch(path: string, init?: RequestInit): Promise<unknown> {
  const token = requireToken()
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init?.headers },
  })

  if (response.status === 401 || response.status === 403) {
    throw new IntegrationError(SERVICE, 'unauthorized', 'CLOUDFLARE_API_TOKEN ist ungültig oder ohne Berechtigung.')
  }
  const data = (await response.json()) as { success: boolean; errors?: { message: string }[]; result?: unknown }
  if (!response.ok || !data.success) {
    const message = data.errors?.[0]?.message ?? `HTTP ${response.status}`
    throw new IntegrationError(SERVICE, 'upstream_error', `Cloudflare-API-Fehler: ${message}`)
  }
  return data.result
}

async function getZoneId(domain: string): Promise<string> {
  const zones = (await cloudflareFetch(`/zones?name=${encodeURIComponent(domain)}`)) as { id: string }[]
  if (zones.length === 0) throw new IntegrationError(SERVICE, 'upstream_error', `Keine Cloudflare-Zone für "${domain}" gefunden.`)
  return zones[0].id
}

export interface DomainExpiry {
  domain: string
  expiresAt: string
  status: string
  autoRenew: boolean
}

/** Nur für Domains, die über Cloudflare Registrar registriert sind (nicht nur DNS-verwaltet). */
export async function getExpiry(domain: string): Promise<DomainExpiry> {
  try {
    const accountId = requireAccountId()
    const data = (await cloudflareFetch(`/accounts/${encodeURIComponent(accountId)}/registrar/domains/${encodeURIComponent(domain)}`)) as {
      expires_at: string
      current_registrar?: string
      auto_renew: boolean
    }
    const result: DomainExpiry = {
      domain,
      expiresAt: data.expires_at,
      status: data.current_registrar ? `bei ${data.current_registrar}` : 'unbekannt',
      autoRenew: data.auto_renew,
    }
    await logIntegrationCall(SERVICE, true)
    return result
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}

export interface DnsRecord {
  type: string
  name: string
  content: string
  ttl: number
  proxied: boolean
}

export async function listDnsRecords(domain: string): Promise<DnsRecord[]> {
  try {
    const zoneId = await getZoneId(domain)
    const records = (await cloudflareFetch(`/zones/${zoneId}/dns_records?per_page=100`)) as {
      type: string
      name: string
      content: string
      ttl: number
      proxied?: boolean
    }[]
    const result = records.map((r) => ({ type: r.type, name: r.name, content: r.content, ttl: r.ttl, proxied: r.proxied ?? false }))
    await logIntegrationCall(SERVICE, true)
    return result
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}
