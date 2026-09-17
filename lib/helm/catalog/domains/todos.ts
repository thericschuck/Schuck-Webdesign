import { z } from 'zod'
import { defineTool, type HelmToolDef } from '../types'
import * as todosDomain from '@/lib/domain/todos'
import type { TodoPriority } from '@/lib/domain/todos'

const PRIORITY_VALUES = ['high', 'medium', 'low'] as const

// ── list_todos ──────────────────────────────────────────────────────────────

const listTodos = defineTool({
  slug: 'list_todos',
  label: 'To-Dos auflisten',
  description: 'Listet To-Dos, optional gefiltert nach Erledigt-Status und/oder Projekt.',
  requiresConfirmation: false,
  schema: z.object({
    done: z.boolean().optional().describe('Optionaler Filter: nur erledigte (true) oder offene (false) To-Dos.'),
    project_id: z.string().optional().describe('Optionaler Filter: nur To-Dos eines bestimmten Projekts (projects.id).'),
  }),
  async execute(args) {
    return todosDomain.listTodos({ done: args.done, projectId: args.project_id })
  },
})

// ── create_todo ─────────────────────────────────────────────────────────────

const createTodo = defineTool({
  slug: 'create_todo',
  label: 'To-Do anlegen',
  description:
    'Legt ein neues To-Do an, optional einem Projekt zugeordnet. Ohne project_id landet es unter "Allgemein". ' +
    'Für Wiedervorlage-Termine bei Leads nicht dieses Tool nutzen, sondern set_wiedervorlage (legt das Todo automatisch mit an).',
  requiresConfirmation: false,
  schema: z.object({
    title: z.string().min(1).describe('Was zu tun ist.'),
    priority: z.enum(PRIORITY_VALUES).optional().describe('Priorität, Standard: medium.'),
    due_date: z.string().optional().describe('Fälligkeitsdatum, Format YYYY-MM-DD (optional).'),
    project_id: z.string().optional().describe('UUID des Projekts, falls zuordenbar (optional).'),
  }),
  async execute(args) {
    return todosDomain.createTodo({
      title: args.title,
      priority: (args.priority as TodoPriority | undefined) ?? undefined,
      dueDate: args.due_date ?? null,
      projectId: args.project_id ?? null,
    })
  },
})

// ── update_todo ─────────────────────────────────────────────────────────────

const updateTodo = defineTool({
  slug: 'update_todo',
  label: 'To-Do aktualisieren',
  description: 'Aktualisiert ein bestehendes To-Do — z.B. als erledigt markieren, Titel/Priorität/Fälligkeit ändern.',
  requiresConfirmation: false,
  schema: z.object({
    todo_id: z.string().describe('UUID des To-Dos (todos.id).'),
    title: z.string().optional().describe('Neuer Titel (optional).'),
    priority: z.enum(PRIORITY_VALUES).optional().describe('Neue Priorität (optional).'),
    due_date: z.string().optional().describe('Neues Fälligkeitsdatum, Format YYYY-MM-DD (optional).'),
    done: z.boolean().optional().describe('Erledigt-Status setzen (optional).'),
  }),
  async execute(args) {
    return todosDomain.updateTodo(args.todo_id, {
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.priority !== undefined ? { priority: args.priority as TodoPriority } : {}),
      ...(args.due_date !== undefined ? { dueDate: args.due_date } : {}),
      ...(args.done !== undefined ? { done: args.done } : {}),
    })
  },
})

// ── delete_todo ─────────────────────────────────────────────────────────────

const deleteTodo = defineTool({
  slug: 'delete_todo',
  label: 'To-Do löschen',
  description: 'Löscht ein To-Do endgültig.',
  requiresConfirmation: false,
  schema: z.object({
    todo_id: z.string().describe('UUID des To-Dos (todos.id).'),
  }),
  async execute(args) {
    await todosDomain.deleteTodo(args.todo_id)
    return { deleted: true }
  },
})

export const todoTools: HelmToolDef[] = [listTodos, createTodo, updateTodo, deleteTodo]
