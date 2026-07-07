import type { JarvisTool } from '../tool-types'
import { optionalString, requireString } from './helpers'
import * as todosDomain from '@/lib/domain/todos'
import type { TodoPriority } from '@/lib/domain/todos'

const PRIORITY_VALUES = ['high', 'medium', 'low'] as const

// ── list_todos ──────────────────────────────────────────────────────────────

const listTodos: JarvisTool = {
  name: 'list_todos',
  requiresConfirmation: false,
  definition: {
    name: 'list_todos',
    description: 'Listet To-Dos, optional gefiltert nach Erledigt-Status und/oder Projekt.',
    input_schema: {
      type: 'object',
      properties: {
        done: { type: 'boolean', description: 'Optionaler Filter: nur erledigte (true) oder offene (false) To-Dos.' },
        project_id: { type: 'string', description: 'Optionaler Filter: nur To-Dos eines bestimmten Projekts (projects.id).' },
      },
    },
  },
  async execute(args) {
    const done = typeof args.done === 'boolean' ? args.done : undefined
    const projectId = optionalString(args, 'project_id')
    return todosDomain.listTodos({ done, projectId: projectId ?? undefined })
  },
}

// ── create_todo ─────────────────────────────────────────────────────────────

const createTodo: JarvisTool = {
  name: 'create_todo',
  requiresConfirmation: false,
  definition: {
    name: 'create_todo',
    description:
      'Legt ein neues To-Do an, optional einem Projekt zugeordnet. Ohne project_id landet es unter "Allgemein". ' +
      'Für Wiedervorlage-Termine bei Leads nicht dieses Tool nutzen, sondern set_wiedervorlage (legt das Todo automatisch mit an).',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Was zu tun ist.' },
        priority: { type: 'string', enum: PRIORITY_VALUES, description: 'Priorität, Standard: medium.' },
        due_date: { type: 'string', description: 'Fälligkeitsdatum, Format YYYY-MM-DD (optional).' },
        project_id: { type: 'string', description: 'UUID des Projekts, falls zuordenbar (optional).' },
      },
      required: ['title'],
    },
  },
  async execute(args) {
    return todosDomain.createTodo({
      title: requireString(args, 'title'),
      priority: (optionalString(args, 'priority') as TodoPriority | null) ?? undefined,
      dueDate: optionalString(args, 'due_date'),
      projectId: optionalString(args, 'project_id'),
    })
  },
}

// ── update_todo ─────────────────────────────────────────────────────────────

const updateTodo: JarvisTool = {
  name: 'update_todo',
  requiresConfirmation: false,
  definition: {
    name: 'update_todo',
    description: 'Aktualisiert ein bestehendes To-Do — z.B. als erledigt markieren, Titel/Priorität/Fälligkeit ändern.',
    input_schema: {
      type: 'object',
      properties: {
        todo_id: { type: 'string', description: 'UUID des To-Dos (todos.id).' },
        title: { type: 'string', description: 'Neuer Titel (optional).' },
        priority: { type: 'string', enum: PRIORITY_VALUES, description: 'Neue Priorität (optional).' },
        due_date: { type: 'string', description: 'Neues Fälligkeitsdatum, Format YYYY-MM-DD (optional).' },
        done: { type: 'boolean', description: 'Erledigt-Status setzen (optional).' },
      },
      required: ['todo_id'],
    },
  },
  async execute(args) {
    const todoId = requireString(args, 'todo_id')
    const title = optionalString(args, 'title')
    const priority = optionalString(args, 'priority') as TodoPriority | null
    const dueDate = optionalString(args, 'due_date')
    const done = typeof args.done === 'boolean' ? args.done : undefined

    return todosDomain.updateTodo(todoId, {
      ...(title ? { title } : {}),
      ...(priority ? { priority } : {}),
      ...(dueDate !== null ? { dueDate } : {}),
      ...(done !== undefined ? { done } : {}),
    })
  },
}

// ── delete_todo ─────────────────────────────────────────────────────────────

const deleteTodo: JarvisTool = {
  name: 'delete_todo',
  requiresConfirmation: false,
  definition: {
    name: 'delete_todo',
    description: 'Löscht ein To-Do endgültig.',
    input_schema: {
      type: 'object',
      properties: {
        todo_id: { type: 'string', description: 'UUID des To-Dos (todos.id).' },
      },
      required: ['todo_id'],
    },
  },
  async execute(args) {
    await todosDomain.deleteTodo(requireString(args, 'todo_id'))
    return { deleted: true }
  },
}

export const todoTools: JarvisTool[] = [listTodos, createTodo, updateTodo, deleteTodo]
