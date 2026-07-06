'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/assert-admin'
import * as akquiseDomain from '@/lib/domain/akquise'

type ActionResult = { status: 'error'; message: string } | { status: 'success' }

export async function logTrackingAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await assertAdmin()

  const num = (key: string) => {
    const v = formData.get(key)
    if (typeof v !== 'string' || !v.trim()) return undefined
    const n = Number(v)
    return Number.isNaN(n) ? undefined : n
  }

  const datum = formData.get('datum')

  try {
    await akquiseDomain.logAkquiseTracking({
      datum: typeof datum === 'string' && datum ? datum : undefined,
      waehlversuche: num('waehlversuche'),
      gespraecheEmpfang: num('gespraeche_empfang'),
      gespraecheEntscheider: num('gespraeche_entscheider'),
      termineVereinbart: num('termine_vereinbart'),
    })
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Fehler beim Speichern.' }
  }

  revalidatePath('/admin/akquise/tracking')
  return { status: 'success' }
}
