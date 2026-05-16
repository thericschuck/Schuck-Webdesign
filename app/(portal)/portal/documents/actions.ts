'use server'

import { createClient } from '@/lib/supabase/server'

export async function getDownloadUrl(fileUrl: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(fileUrl, 3600)

  return data?.signedUrl ?? null
}
