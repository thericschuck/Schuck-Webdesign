import type { JarvisTool } from '../tool-types'
import { optionalString, requireString } from './helpers'
import * as projectsDomain from '@/lib/domain/projects'
import type { ProjectStatus } from '@/types/database'

const PROJECT_STATUS_VALUES = projectsDomain.PROJECT_STATUS_VALUES

// ── list_projects ───────────────────────────────────────────────────────────

const listProjects: JarvisTool = {
  name: 'list_projects',
  requiresConfirmation: false,
  definition: {
    name: 'list_projects',
    description: 'Listet Projekte, optional gefiltert nach Kunde und/oder Status.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'Optional: nur Projekte dieses Kunden (clients.id).' },
        status: { type: 'string', enum: PROJECT_STATUS_VALUES, description: 'Optionaler Statusfilter.' },
      },
    },
  },
  async execute(args) {
    return projectsDomain.listProjects({
      clientId: optionalString(args, 'client_id') ?? undefined,
      status: (optionalString(args, 'status') as ProjectStatus | null) ?? undefined,
    })
  },
}

// ── get_project ─────────────────────────────────────────────────────────────

const getProject: JarvisTool = {
  name: 'get_project',
  requiresConfirmation: false,
  definition: {
    name: 'get_project',
    description: 'Liefert ein Projekt mit Updates, To-Dos und Meetings.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'UUID des Projekts (projects.id).' },
      },
      required: ['project_id'],
    },
  },
  async execute(args) {
    return projectsDomain.getProject(requireString(args, 'project_id'))
  },
}

// ── create_project ──────────────────────────────────────────────────────────

const createProject: JarvisTool = {
  name: 'create_project',
  requiresConfirmation: false,
  definition: {
    name: 'create_project',
    description: 'Legt ein neues Projekt für einen Kunden an und vergibt automatisch die Projektnummer.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'UUID des Kunden (clients.id).' },
        title: { type: 'string', description: 'Projekttitel.' },
        description: { type: 'string', description: 'Beschreibung (optional).' },
        status: {
          type: 'string',
          enum: PROJECT_STATUS_VALUES,
          description: "Projektstatus. Default 'briefing'.",
        },
        start_date: { type: 'string', description: 'Startdatum, Format YYYY-MM-DD (optional).' },
        launch_date: { type: 'string', description: 'Launch-Datum, Format YYYY-MM-DD (optional).' },
      },
      required: ['client_id', 'title'],
    },
  },
  async execute(args) {
    return projectsDomain.createProject({
      clientId: requireString(args, 'client_id'),
      title: requireString(args, 'title'),
      description: optionalString(args, 'description'),
      status: (optionalString(args, 'status') as ProjectStatus | null) ?? undefined,
      startDate: optionalString(args, 'start_date'),
      launchDate: optionalString(args, 'launch_date'),
    })
  },
}

// ── update_project ──────────────────────────────────────────────────────────

const updateProject: JarvisTool = {
  name: 'update_project',
  requiresConfirmation: false,
  definition: {
    name: 'update_project',
    description: 'Aktualisiert Titel, Beschreibung, Status, Termine oder interne Notizen eines Projekts.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'UUID des Projekts (projects.id).' },
        title: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: PROJECT_STATUS_VALUES },
        start_date: { type: 'string', description: 'Format YYYY-MM-DD.' },
        launch_date: { type: 'string', description: 'Format YYYY-MM-DD.' },
        internal_notes: { type: 'string' },
      },
      required: ['project_id'],
    },
  },
  async execute(args) {
    const projectId = requireString(args, 'project_id')
    return projectsDomain.updateProject(projectId, {
      title: optionalString(args, 'title') ?? undefined,
      description: optionalString(args, 'description'),
      status: (optionalString(args, 'status') as ProjectStatus | null) ?? undefined,
      start_date: optionalString(args, 'start_date'),
      launch_date: optionalString(args, 'launch_date'),
      internal_notes: optionalString(args, 'internal_notes'),
    })
  },
}

// ── delete_project ──────────────────────────────────────────────────────────

const deleteProject: JarvisTool = {
  name: 'delete_project',
  requiresConfirmation: true,
  definition: {
    name: 'delete_project',
    description: 'Löscht ein Projekt unwiderruflich inkl. Nachrichten, Änderungsanfragen und Bewertungen. Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'UUID des Projekts (projects.id).' },
      },
      required: ['project_id'],
    },
  },
  async execute(args) {
    const result = await projectsDomain.deleteProject(requireString(args, 'project_id'))
    return { deleted: true, title: result.title }
  },
}

// ── add_project_update ──────────────────────────────────────────────────────

const addProjectUpdate: JarvisTool = {
  name: 'add_project_update',
  requiresConfirmation: false,
  definition: {
    name: 'add_project_update',
    description: 'Fügt eine neue Update-Nachricht zum Projektverlauf hinzu (sichtbar für den Kunden im Portal).',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'UUID des Projekts (projects.id).' },
        message: { type: 'string', description: 'Update-Text.' },
      },
      required: ['project_id', 'message'],
    },
  },
  async execute(args) {
    return projectsDomain.addProjectUpdate(requireString(args, 'project_id'), requireString(args, 'message'))
  },
}

export const projectTools: JarvisTool[] = [
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addProjectUpdate,
]
