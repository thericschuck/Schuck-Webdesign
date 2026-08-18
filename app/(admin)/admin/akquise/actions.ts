'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { assertAdmin } from '@/lib/auth/assert-admin'
import * as akquiseDomain from '@/lib/domain/akquise'
import { syncAkquiseFromSheet, type SyncResult } from '@/lib/domain/akquise-sync'
import type { LeadStage } from '@/types/database'

type SyncActionResult = { status: 'error'; message: string } | { status: 'success'; result: SyncResult }

export async function updateLeadStage(leadId: string, stage: LeadStage): Promise<void> {
  await assertAdmin()
  await akquiseDomain.updateLead(leadId, { current_stage: stage })
  revalidatePath('/admin/akquise')
  revalidatePath(`/admin/akquise/${leadId}`)
}

export async function convertContactToLead(submissionId: string): Promise<void> {
  await assertAdmin()
  const lead = await akquiseDomain.convertContactSubmissionToLead(submissionId)
  revalidatePath('/admin/contact')
  revalidatePath('/admin/akquise')
  redirect(`/admin/akquise/${lead.id}`)
}

export async function syncAkquiseSheetAction(): Promise<SyncActionResult> {
  await assertAdmin()

  try {
    const result = await syncAkquiseFromSheet()
    revalidatePath('/admin/akquise')
    revalidatePath('/admin/akquise/tracking')
    revalidatePath('/admin/akquise/stats')
    return { status: 'success', result }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Sync fehlgeschlagen.' }
  }
}
