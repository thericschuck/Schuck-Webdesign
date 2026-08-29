import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import * as todosDomain from '@/lib/domain/todos'

/**
 * Read-only-Endpunkt für das Android-Homescreen-Widget (siehe widget-android/).
 *
 * Warum ein eigener Token statt der normalen Session: ein Homescreen-Widget hat keinen
 * Browser, keine Cookies und kann keinen Login-Flow durchlaufen. Es authentifiziert sich
 * deshalb mit einem statischen Bearer-Token aus `WIDGET_API_TOKEN` — gleiches Muster wie
 * `CRON_SECRET` bei den Cron-Routen.
 *
 * Der Endpunkt ist bewusst nur lesend und liefert ausschließlich To-Dos — keine Kunden-,
 * Rechnungs- oder Akquisedaten. Wer den Token hat, kann To-Do-Titel lesen, sonst nichts.
 */

const MAX_ITEMS = 20

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  // timingSafeEqual wirft bei unterschiedlicher Länge — Länge vorher prüfen.
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function GET(request: NextRequest) {
  const expected = process.env.WIDGET_API_TOKEN
  if (!expected) {
    return NextResponse.json({ error: 'WIDGET_API_TOKEN ist nicht konfiguriert.' }, { status: 503 })
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!provided || !tokenMatches(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let todos
  try {
    todos = await todosDomain.listTodos({ done: false })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Laden.' },
      { status: 500 }
    )
  }

  // Lokales Datum (Europe/Berlin), nicht UTC — sonst gilt ein heute fälliges To-Do
  // zwischen 00:00 und 02:00 fälschlich schon als überfällig bzw. andersherum.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date())

  const items = todos.map((todo) => ({
    id: todo.id,
    title: todo.title,
    priority: todo.priority,
    dueDate: todo.due_date,
    project: todo.project_title,
    overdue: !!todo.due_date && todo.due_date < today,
    dueToday: todo.due_date === today,
  }))

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      openCount: items.length,
      overdueCount: items.filter((i) => i.overdue).length,
      dueTodayCount: items.filter((i) => i.dueToday).length,
      // listTodos sortiert bereits nach due_date aufsteigend (ohne Datum ans Ende).
      todos: items.slice(0, MAX_ITEMS),
    },
    // Ein Widget fragt periodisch — nichts zwischenspeichern, sonst zeigt es alte Stände.
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
