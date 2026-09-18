'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { SUBAGENTS } from '../subagents'
import { computeNextRunAt, executeAutomation } from '../automations'

type ActionResult = { status: 'error'; message: string } | null

const VALID_AGENT_SLUGS = new Set(['orchestrator', ...SUBAGENTS.map((s) => s.name)])
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

interface ParsedAutomationFields {
  label: string
  agent_slug: string
  task: string
  recurrence: 'daily' | 'weekly'
  weekday: number | null
  time_of_day: string
}

type ReadFieldsResult = { ok: true; value: ParsedAutomationFields } | { ok: false; error: string }

function readFields(formData: FormData): ReadFieldsResult {
  const label = String(formData.get('label') ?? '').trim()
  const agentSlug = String(formData.get('agent_slug') ?? '').trim()
  const task = String(formData.get('task') ?? '').trim()
  const recurrence = String(formData.get('recurrence') ?? '').trim()
  const weekdayRaw = formData.get('weekday')
  const timeOfDay = String(formData.get('time_of_day') ?? '').trim()

  if (!label) return { ok: false, error: 'Bitte eine Bezeichnung angeben.' }
  if (!VALID_AGENT_SLUGS.has(agentSlug)) return { ok: false, error: 'Bitte einen gültigen Ziel-Agenten wählen.' }
  if (!task) return { ok: false, error: 'Bitte eine Aufgabe angeben.' }
  if (recurrence !== 'daily' && recurrence !== 'weekly') return { ok: false, error: 'Bitte einen Rhythmus wählen.' }
  if (!TIME_PATTERN.test(timeOfDay)) return { ok: false, error: 'Bitte eine gültige Uhrzeit (HH:MM) angeben.' }

  let weekday: number | null = null
  if (recurrence === 'weekly') {
    const parsed = weekdayRaw != null ? Number(weekdayRaw) : NaN
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 6) {
      return { ok: false, error: 'Bitte einen Wochentag wählen.' }
    }
    weekday = parsed
  }

  return {
    ok: true,
    value: { label, agent_slug: agentSlug, task, recurrence, weekday, time_of_day: `${timeOfDay}:00` },
  }
}

export async function createAutomation(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await assertAdmin()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const parsed = readFields(formData)
  if (!parsed.ok) return { status: 'error', message: parsed.error }

  const nextRunAt = computeNextRunAt(parsed.value)
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('helm_automations').insert({
    ...parsed.value,
    next_run_at: nextRunAt.toISOString(),
    created_by: user?.id ?? null,
  })

  if (error) return { status: 'error', message: error.message }
  redirect('/admin/helm/automations')
}

export async function updateAutomation(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await assertAdmin()

  const parsed = readFields(formData)
  if (!parsed.ok) return { status: 'error', message: parsed.error }

  const nextRunAt = computeNextRunAt(parsed.value)
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('helm_automations')
    .update({ ...parsed.value, next_run_at: nextRunAt.toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { status: 'error', message: error.message }
  revalidatePath('/admin/helm/automations')
  redirect('/admin/helm/automations')
}

export async function deleteAutomation(id: string): Promise<ActionResult> {
  await assertAdmin()
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('helm_automations').delete().eq('id', id)
  if (error) return { status: 'error', message: error.message }
  revalidatePath('/admin/helm/automations')
  return null
}

export async function toggleAutomationStatus(id: string, next: 'active' | 'paused'): Promise<ActionResult> {
  await assertAdmin()
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('helm_automations')
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { status: 'error', message: error.message }
  revalidatePath('/admin/helm/automations')
  return null
}

/** Manueller "Jetzt ausführen"-Knopf — kein Claim/CAS nötig (Einzelklick, keine
 * Nebenläufigkeit), nutzt aber dieselbe executeAutomation() wie der Cron-Dispatcher. */
export async function runAutomationNow(id: string): Promise<ActionResult> {
  await assertAdmin()
  const adminClient = createAdminClient()
  const { data: automation, error } = await adminClient.from('helm_automations').select('*').eq('id', id).maybeSingle()
  if (error || !automation) return { status: 'error', message: 'Automation nicht gefunden.' }

  await executeAutomation(automation)
  revalidatePath('/admin/helm/automations')
  return null
}
