'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { setIntegrationSetting } from '@/lib/integrations/settings'

export async function setTokenIssuedAt(service: string, settingKey: string, formData: FormData) {
  await assertAdmin()

  const value = String(formData.get('issued_at') ?? '').trim()
  if (!value) return

  await setIntegrationSetting(service, settingKey, value)
  revalidatePath('/admin/integrationen')
}
