import { IntegrationError } from './errors'
import { logIntegrationCall } from './log'

const SERVICE = 'vercel'
const API_BASE = 'https://api.vercel.com'

export function isConfigured(): boolean {
  return Boolean(process.env.VERCEL_API_TOKEN?.trim())
}

function requireToken(): string {
  const token = process.env.VERCEL_API_TOKEN
  if (!token) throw new IntegrationError(SERVICE, 'missing_key', 'VERCEL_API_TOKEN ist nicht konfiguriert.')
  return token
}

function withTeamId(path: string): string {
  const teamId = process.env.VERCEL_TEAM_ID
  if (!teamId) return path
  return `${path}${path.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(teamId)}`
}

async function vercelFetch(path: string): Promise<unknown> {
  const token = requireToken()
  const response = await fetch(`${API_BASE}${withTeamId(path)}`, { headers: { Authorization: `Bearer ${token}` } })

  if (response.status === 401 || response.status === 403) {
    throw new IntegrationError(SERVICE, 'unauthorized', 'VERCEL_API_TOKEN ist ungültig oder ohne Berechtigung.')
  }
  if (response.status === 404) {
    throw new IntegrationError(SERVICE, 'upstream_error', 'Projekt nicht gefunden (404).')
  }
  if (!response.ok) {
    throw new IntegrationError(SERVICE, 'upstream_error', `Vercel-API-Fehler (${response.status}).`)
  }
  return response.json()
}

export interface DeploymentStatus {
  projectName: string
  latestDeployment: { state: string; url: string; createdAt: string } | null
}

export async function getDeploymentStatus(projectIdOrName: string): Promise<DeploymentStatus> {
  try {
    const project = (await vercelFetch(`/v9/projects/${encodeURIComponent(projectIdOrName)}`)) as { id: string; name: string }

    const deployments = (await vercelFetch(`/v6/deployments?projectId=${encodeURIComponent(project.id)}&limit=1`)) as {
      deployments: { state: string; url: string; createdAt: number }[]
    }

    const latest = deployments.deployments[0]
    const result: DeploymentStatus = {
      projectName: project.name,
      latestDeployment: latest ? { state: latest.state, url: `https://${latest.url}`, createdAt: new Date(latest.createdAt).toISOString() } : null,
    }
    await logIntegrationCall(SERVICE, true)
    return result
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}
