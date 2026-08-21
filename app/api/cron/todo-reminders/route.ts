import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import * as notificationsDomain from '@/lib/domain/notifications'

/**
 * Tägliche Prüfung auf fällige To-Dos (vercel.json → crons). Jedes To-Do wird nur EINMAL
 * gemeldet (reminder_sent_at wird danach gesetzt) — sonst würde ein überfälliges To-Do
 * jeden Tag erneut anschlagen.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET ist nicht konfiguriert.' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: dueTodos, error } = await adminClient
    .from('todos')
    .select('id, title, due_date')
    .eq('done', false)
    .is('reminder_sent_at', null)
    .not('due_date', 'is', null)
    .lte('due_date', today)

  if (error) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
  }

  for (const todo of dueTodos ?? []) {
    await notificationsDomain.notifyAdmin({
      title: 'To-Do fällig',
      body: todo.title,
      url: '/admin/todos',
    })
    await adminClient.from('todos').update({ reminder_sent_at: new Date().toISOString() }).eq('id', todo.id)
  }

  return NextResponse.json({ status: 'success', notified: dueTodos?.length ?? 0 })
}
