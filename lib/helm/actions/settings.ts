'use server'

import { assertAdmin } from '@/lib/auth/assert-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALLOWED_AGENT_MODELS } from '../catalog/models'
import { DEFAULT_HELM_EFFORT, DEFAULT_HELM_MODEL, HELM_EFFORT_OPTIONS, type HelmEffort } from '../settings'

export interface HelmSettingsValue {
  model: string
  effort: HelmEffort
}

async function currentUserId(): Promise<string> {
  const supabase = await assertAdmin()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet.')
  return user.id
}

export async function getHelmSettings(): Promise<HelmSettingsValue> {
  const userId = await currentUserId()
  const adminClient = createAdminClient()
  const { data } = await adminClient.from('helm_settings').select('model, effort').eq('profile_id', userId).maybeSingle()

  return {
    model: data?.model ?? DEFAULT_HELM_MODEL,
    effort: (data?.effort as HelmEffort | undefined) ?? DEFAULT_HELM_EFFORT,
  }
}

/** Schreibt nur die tatsächlich übergebenen Felder (Upsert statt vollem Formular-Save) —
 * Modell und Denktiefe werden im Chat-Header unabhängig voneinander umgeschaltet. */
export async function updateHelmModelEffort(partial: Partial<HelmSettingsValue>): Promise<{ status: 'error'; message: string } | null> {
  const userId = await currentUserId()

  if (partial.model && !ALLOWED_AGENT_MODELS.includes(partial.model as (typeof ALLOWED_AGENT_MODELS)[number])) {
    return { status: 'error', message: 'Unbekanntes Modell.' }
  }
  if (partial.effort && !HELM_EFFORT_OPTIONS.some((o) => o.value === partial.effort)) {
    return { status: 'error', message: 'Unbekannte Denktiefe.' }
  }

  const current = await getHelmSettings()
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('helm_settings').upsert({
    profile_id: userId,
    model: partial.model ?? current.model,
    effort: partial.effort ?? current.effort,
    updated_at: new Date().toISOString(),
  })

  if (error) return { status: 'error', message: error.message }
  return null
}
