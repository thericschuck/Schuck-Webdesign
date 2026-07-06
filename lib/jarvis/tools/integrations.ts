import type { JarvisTool } from '../tool-types'
import { optionalString, requireString } from './helpers'
import * as figma from '@/lib/integrations/figma'
import * as github from '@/lib/integrations/github'
import * as vercel from '@/lib/integrations/vercel'

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

export const integrationTools: JarvisTool[] = [
  figmaGetDesignContext,
  figmaGetScreenshot,
  githubGetRepoStatus,
  githubListIssues,
  githubGetFile,
  vercelGetDeploymentStatus,
]
