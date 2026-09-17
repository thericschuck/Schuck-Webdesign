'use server'

import { assertAdmin } from '@/lib/auth/assert-admin'
import { clearHelmMessages } from '@/lib/helm/persistence'

// confirmPendingAction/rejectPendingAction leben in lib/helm/actions/confirm.ts (eigene
// 'use server'-Datei, direkt von dort importierbar) — hier nur der UI-route-spezifische Teil.

type ActionResult = { status: 'error'; message: string } | { status: 'success'; message: string }

export async function clearHelmHistory(): Promise<ActionResult> {
  const supabase = await assertAdmin()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Nicht angemeldet.' }

  await clearHelmMessages(user.id)
  return { status: 'success', message: 'Verlauf gelöscht.' }
}
