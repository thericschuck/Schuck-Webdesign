import { IntegrationError } from './errors'
import { logIntegrationCall } from './log'

const SERVICE = 'github'
const API_BASE = 'https://api.github.com'

export function isConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN?.trim())
}

function requireToken(): string {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new IntegrationError(SERVICE, 'missing_key', 'GITHUB_TOKEN ist nicht konfiguriert.')
  return token
}

async function githubFetch(path: string): Promise<unknown> {
  const token = requireToken()
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  })

  if (response.status === 401 || response.status === 403) {
    throw new IntegrationError(SERVICE, 'unauthorized', 'GITHUB_TOKEN ist ungültig, abgelaufen oder ohne Berechtigung.')
  }
  if (response.status === 404) {
    throw new IntegrationError(SERVICE, 'upstream_error', 'Repository/Datei nicht gefunden (404).')
  }
  if (!response.ok) {
    throw new IntegrationError(SERVICE, 'upstream_error', `GitHub-API-Fehler (${response.status}).`)
  }
  return response.json()
}

export interface RepoStatus {
  fullName: string
  defaultBranch: string
  openIssuesCount: number
  pushedAt: string
  htmlUrl: string
  archived: boolean
}

export async function getRepoStatus(owner: string, repo: string): Promise<RepoStatus> {
  try {
    const data = (await githubFetch(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`)) as {
      full_name: string
      default_branch: string
      open_issues_count: number
      pushed_at: string
      html_url: string
      archived: boolean
    }
    const result: RepoStatus = {
      fullName: data.full_name,
      defaultBranch: data.default_branch,
      openIssuesCount: data.open_issues_count,
      pushedAt: data.pushed_at,
      htmlUrl: data.html_url,
      archived: data.archived,
    }
    await logIntegrationCall(SERVICE, true)
    return result
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}

export interface IssueSummary {
  number: number
  title: string
  state: string
  htmlUrl: string
  createdAt: string
}

export async function listIssues(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<IssueSummary[]> {
  try {
    const data = (await githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=${state}&per_page=30`
    )) as { number: number; title: string; state: string; html_url: string; created_at: string; pull_request?: unknown }[]

    const result = data
      .filter((issue) => !issue.pull_request) // GitHub listet PRs als "Issues" mit — hier ausschließen
      .map((issue) => ({ number: issue.number, title: issue.title, state: issue.state, htmlUrl: issue.html_url, createdAt: issue.created_at }))
    await logIntegrationCall(SERVICE, true)
    return result
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}

export async function getFile(owner: string, repo: string, path: string, ref?: string): Promise<string> {
  try {
    const query = ref ? `?ref=${encodeURIComponent(ref)}` : ''
    const data = (await githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}${query}`
    )) as { content?: string; encoding?: string; type?: string }

    if (data.type !== 'file' || !data.content) {
      throw new IntegrationError(SERVICE, 'upstream_error', `"${path}" ist keine lesbare Datei.`)
    }
    const content = Buffer.from(data.content, (data.encoding as BufferEncoding) ?? 'base64').toString('utf-8')
    await logIntegrationCall(SERVICE, true)
    return content
  } catch (error) {
    await logIntegrationCall(SERVICE, false, error instanceof Error ? error.message : 'Unbekannter Fehler')
    throw error
  }
}
