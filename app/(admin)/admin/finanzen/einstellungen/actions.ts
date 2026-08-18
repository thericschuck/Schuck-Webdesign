'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/assert-admin'
import * as financeDomain from '@/lib/domain/finance'

type ActionResult = { status: 'error'; message: string } | { status: 'success' }

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

export async function updateCompanySettingsAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await assertAdmin()

  try {
    await financeDomain.updateCompanySettings({
      companyName: str(formData, 'company_name') ?? undefined,
      inhaber: str(formData, 'inhaber'),
      addressStreet: str(formData, 'address_street'),
      addressZip: str(formData, 'address_zip'),
      addressCity: str(formData, 'address_city'),
      addressCountry: str(formData, 'address_country') ?? undefined,
      email: str(formData, 'email'),
      phone: str(formData, 'phone'),
      website: str(formData, 'website'),
      iban: str(formData, 'iban'),
      bic: str(formData, 'bic'),
      bankName: str(formData, 'bank_name'),
      steuernummer: str(formData, 'steuernummer'),
      ustId: str(formData, 'ust_id'),
      ustPflichtig: formData.get('ust_pflichtig') === 'on',
    })
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Fehler beim Speichern.' }
  }

  revalidatePath('/admin/finanzen/einstellungen')
  return { status: 'success' }
}
