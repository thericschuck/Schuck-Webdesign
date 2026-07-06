'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { assertAdmin } from '@/lib/auth/assert-admin'
import * as akquiseDomain from '@/lib/domain/akquise'
import type { LeadPrioritaet, LeadStage } from '@/types/database'

type ActionResult = { status: 'error'; message: string } | { status: 'success' }

export async function updateLeadStage(leadId: string, stage: LeadStage): Promise<void> {
  await assertAdmin()
  await akquiseDomain.updateLead(leadId, { current_stage: stage })
  revalidatePath('/admin/akquise')
  revalidatePath(`/admin/akquise/${leadId}`)
}

export async function createLeadAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await assertAdmin()

  const str = (key: string) => {
    const v = formData.get(key)
    return typeof v === 'string' && v.trim() ? v.trim() : null
  }

  const firmenname = str('firmenname')
  if (!firmenname) return { status: 'error', message: 'Firmenname ist erforderlich.' }

  try {
    await akquiseDomain.createLead({
      firmenname,
      ansprechpartner: str('ansprechpartner'),
      zielgruppe: str('zielgruppe'),
      stadt: str('stadt'),
      website: str('website'),
      phone: str('phone'),
      email: str('email'),
      quelle: str('quelle'),
      websiteQualitaet: str('website_qualitaet'),
      prioritaet: (str('prioritaet') as LeadPrioritaet | null) ?? undefined,
      notizen: str('notizen'),
    })
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Lead konnte nicht angelegt werden.' }
  }

  revalidatePath('/admin/akquise')
  return { status: 'success' }
}

export async function convertContactToLead(submissionId: string): Promise<void> {
  await assertAdmin()
  const lead = await akquiseDomain.convertContactSubmissionToLead(submissionId)
  revalidatePath('/admin/contact')
  revalidatePath('/admin/akquise')
  redirect(`/admin/akquise/${lead.id}`)
}
