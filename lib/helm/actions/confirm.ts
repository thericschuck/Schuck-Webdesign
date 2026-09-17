'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { CATALOG_BY_SLUG } from '../catalog/registry'
import type { Json } from '@/types/database'

type ActionResult = { status: 'error'; message: string } | { status: 'success'; message: string }

/**
 * Bestätigt einen pending_actions-Vorschlag: lädt die Zeile, prüft race-sicher per
 * `WHERE status='pending'`, führt HelmToolDef.execute() mit den gespeicherten Argumenten aus
 * und schreibt das Ergebnis zurück. Kein Resume irgendeiner Modell-Konversation nötig — der
 * ursprüngliche Chat-Turn, der den Vorschlag erzeugt hat, ist längst abgeschlossen (siehe
 * lib/helm/actions/pending-actions.ts).
 */
export async function confirmPendingAction(actionId: string): Promise<ActionResult> {
  await assertAdmin()
  const adminClient = createAdminClient()

  const { data: pending, error: loadError } = await adminClient
    .from('pending_actions')
    .select('*')
    .eq('id', actionId)
    .maybeSingle()

  if (loadError || !pending) {
    return { status: 'error', message: 'Vorschlag nicht gefunden.' }
  }
  if (pending.status !== 'pending') {
    return { status: 'error', message: 'Dieser Vorschlag wurde bereits entschieden.' }
  }
  if (new Date(pending.expires_at).getTime() < Date.now()) {
    await adminClient
      .from('pending_actions')
      .update({ status: 'expired', decided_at: new Date().toISOString() })
      .eq('id', actionId)
      .eq('status', 'pending')
    return { status: 'error', message: 'Dieser Vorschlag ist abgelaufen.' }
  }

  const def = CATALOG_BY_SLUG.get(pending.tool_name)
  if (!def) {
    return { status: 'error', message: `Tool "${pending.tool_name}" ist nicht mehr registriert.` }
  }

  try {
    const result = await def.execute(pending.tool_args)

    const { data: updated, error: updateError } = await adminClient
      .from('pending_actions')
      .update({
        status: 'approved',
        decided_at: new Date().toISOString(),
        result: (result ?? null) as Json,
      })
      .eq('id', actionId)
      .eq('status', 'pending') // race-sicher: ein Doppelklick gewinnt nur einmal
      .select('id')
      .maybeSingle()

    if (updateError || !updated) {
      return { status: 'error', message: 'Aktion wurde ausgeführt, aber der Status konnte nicht aktualisiert werden — bitte prüfen.' }
    }

    revalidatePath('/admin/helm')
    return { status: 'success', message: pending.summary ?? def.label }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    await adminClient
      .from('pending_actions')
      .update({ error: { message } as Json })
      .eq('id', actionId)
      .eq('status', 'pending')
    return { status: 'error', message: `Ausführung fehlgeschlagen: ${message}` }
  }
}

export async function rejectPendingAction(actionId: string): Promise<ActionResult> {
  await assertAdmin()
  const adminClient = createAdminClient()

  const { data: updated, error } = await adminClient
    .from('pending_actions')
    .update({ status: 'rejected', decided_at: new Date().toISOString() })
    .eq('id', actionId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (error || !updated) {
    return { status: 'error', message: 'Vorschlag nicht gefunden oder bereits entschieden.' }
  }

  revalidatePath('/admin/helm')
  return { status: 'success', message: 'Abgelehnt.' }
}
