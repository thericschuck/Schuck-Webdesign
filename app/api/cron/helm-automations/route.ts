import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { executeAutomation } from '@/lib/helm/automations'

export const runtime = 'nodejs'
export const maxDuration = 300

// Verhindert, dass eine sehr lange fällige Warteschlange eine einzelne Dispatcher-Ausführung
// über das Vercel-Funktions-Timeout hinaus laufen lässt — der Rest wird beim nächsten
// 15-Minuten-Tick abgearbeitet (siehe vercel.json).
const MAX_PER_TICK = 20

/**
 * Alle 15 Min. per Vercel Cron (vercel.json). Gleicher CRON_SECRET-Bearer-Check wie
 * akquise-sync/todo-reminders. Holt fällige helm_automations, beansprucht jede race-sicher
 * per Compare-and-Swap auf next_run_at (analog lib/helm/actions/confirm.ts#confirmPendingAction
 * — WHERE-Klausel auf den erwarteten alten Wert statt einem separaten "running"-Flag: stirbt
 * die Funktion mitten im Lauf, ist die Automation einfach bis zu 1h "nicht fällig" statt für
 * immer hängen zu bleiben) und führt sie aus.
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
  const { data: due, error } = await adminClient
    .from('helm_automations')
    .select('*')
    .eq('status', 'active')
    .lte('next_run_at', new Date().toISOString())
    .order('next_run_at', { ascending: true })
    .limit(MAX_PER_TICK)

  if (error) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
  }

  let processed = 0
  let skipped = 0

  for (const automation of due ?? []) {
    // Optimistischer Claim: schlägt fehl (kein Treffer), wenn eine andere Dispatcher-Ausführung
    // diese Automation zwischen SELECT und hier bereits übernommen hat.
    const farFuture = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const { data: claimed } = await adminClient
      .from('helm_automations')
      .update({ next_run_at: farFuture })
      .eq('id', automation.id)
      .eq('next_run_at', automation.next_run_at)
      .select('*')
      .maybeSingle()

    if (!claimed) {
      skipped += 1
      continue
    }

    await executeAutomation(claimed)
    processed += 1
  }

  return NextResponse.json({ status: 'success', processed, skipped })
}
