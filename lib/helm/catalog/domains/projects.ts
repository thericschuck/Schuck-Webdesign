import { z } from 'zod'
import { defineTool, type HelmToolDef } from '../types'
import * as projectsDomain from '@/lib/domain/projects'
import type { ProjectStatus } from '@/types/database'

const PROJECT_STATUS_VALUES = projectsDomain.PROJECT_STATUS_VALUES as unknown as [string, ...string[]]

// ── list_projects ───────────────────────────────────────────────────────────

const listProjects = defineTool({
  slug: 'list_projects',
  label: 'Projekte auflisten',
  description: 'Listet Projekte, optional gefiltert nach Kunde und/oder Status.',
  requiresConfirmation: false,
  schema: z.object({
    client_id: z.string().optional().describe('Optional: nur Projekte dieses Kunden (clients.id).'),
    status: z.enum(PROJECT_STATUS_VALUES).optional().describe('Optionaler Statusfilter.'),
  }),
  async execute(args) {
    return projectsDomain.listProjects({
      clientId: args.client_id,
      status: (args.status as ProjectStatus | undefined) ?? undefined,
    })
  },
})

// ── get_project ─────────────────────────────────────────────────────────────

const getProject = defineTool({
  slug: 'get_project',
  label: 'Projekt abrufen',
  description: 'Liefert ein Projekt mit Updates, To-Dos und Meetings.',
  requiresConfirmation: false,
  schema: z.object({
    project_id: z.string().describe('UUID des Projekts (projects.id).'),
  }),
  async execute(args) {
    return projectsDomain.getProject(args.project_id)
  },
})

// ── create_project ──────────────────────────────────────────────────────────

const createProject = defineTool({
  slug: 'create_project',
  label: 'Projekt anlegen',
  description: 'Legt ein neues Projekt für einen Kunden an und vergibt automatisch die Projektnummer.',
  requiresConfirmation: false,
  schema: z.object({
    client_id: z.string().describe('UUID des Kunden (clients.id).'),
    title: z.string().describe('Projekttitel.'),
    description: z.string().optional().describe('Beschreibung (optional).'),
    status: z.enum(PROJECT_STATUS_VALUES).optional().describe("Projektstatus. Default 'briefing'."),
    start_date: z.string().optional().describe('Startdatum, Format YYYY-MM-DD (optional).'),
    launch_date: z.string().optional().describe('Launch-Datum, Format YYYY-MM-DD (optional).'),
  }),
  async execute(args) {
    return projectsDomain.createProject({
      clientId: args.client_id,
      title: args.title,
      description: args.description ?? null,
      status: (args.status as ProjectStatus | undefined) ?? undefined,
      startDate: args.start_date ?? null,
      launchDate: args.launch_date ?? null,
    })
  },
})

// ── update_project ──────────────────────────────────────────────────────────

const updateProject = defineTool({
  slug: 'update_project',
  label: 'Projekt aktualisieren',
  description: 'Aktualisiert Titel, Beschreibung, Status, Termine oder interne Notizen eines Projekts.',
  requiresConfirmation: false,
  schema: z.object({
    project_id: z.string().describe('UUID des Projekts (projects.id).'),
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(PROJECT_STATUS_VALUES).optional(),
    start_date: z.string().optional().describe('Format YYYY-MM-DD.'),
    launch_date: z.string().optional().describe('Format YYYY-MM-DD.'),
    internal_notes: z.string().optional(),
  }),
  async execute(args) {
    return projectsDomain.updateProject(args.project_id, {
      title: args.title ?? undefined,
      description: args.description ?? null,
      status: (args.status as ProjectStatus | undefined) ?? undefined,
      start_date: args.start_date ?? null,
      launch_date: args.launch_date ?? null,
      internal_notes: args.internal_notes ?? null,
    })
  },
})

// ── delete_project ──────────────────────────────────────────────────────────

const deleteProject = defineTool({
  slug: 'delete_project',
  label: 'Projekt löschen',
  description: 'Löscht ein Projekt unwiderruflich inkl. Nachrichten, Änderungsanfragen und Bewertungen. Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    project_id: z.string().describe('UUID des Projekts (projects.id).'),
  }),
  summarize: (args) => `Projekt ${args.project_id} unwiderruflich löschen (inkl. Nachrichten, Änderungsanfragen, Bewertungen).`,
  async execute(args) {
    const result = await projectsDomain.deleteProject(args.project_id)
    return { deleted: true, title: result.title }
  },
})

// ── add_project_update ──────────────────────────────────────────────────────

const addProjectUpdate = defineTool({
  slug: 'add_project_update',
  label: 'Projekt-Update hinzufügen',
  description: 'Fügt eine neue Update-Nachricht zum Projektverlauf hinzu (sichtbar für den Kunden im Portal).',
  requiresConfirmation: false,
  schema: z.object({
    project_id: z.string().describe('UUID des Projekts (projects.id).'),
    message: z.string().describe('Update-Text.'),
  }),
  async execute(args) {
    return projectsDomain.addProjectUpdate(args.project_id, args.message)
  },
})

export const projectTools: HelmToolDef[] = [
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addProjectUpdate,
]
