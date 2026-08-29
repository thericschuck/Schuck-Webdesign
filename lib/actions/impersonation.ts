'use server'

import { redirect } from 'next/navigation'
import { endImpersonation } from '@/lib/auth/impersonation'

/**
 * Verlässt die Kundenansicht und stellt die Admin-Session wieder her.
 * Bewusst hier (und nicht unter app/(admin)/…) abgelegt, weil die Action aus dem
 * PORTAL-Banner heraus aufgerufen wird — dort ist zu dem Zeitpunkt eine Kunden-Session
 * aktiv, ein Admin-Guard wäre also falsch. Absicherung ist stattdessen das httpOnly-
 * Cookie: ohne gültigen, dort geparkten Admin-Refresh-Token passiert nichts außer
 * einem Redirect.
 */
export async function stopImpersonation(): Promise<void> {
  const target = await endImpersonation()
  redirect(target)
}
