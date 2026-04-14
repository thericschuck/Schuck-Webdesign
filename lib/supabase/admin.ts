import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Supabase Admin Client mit Service Role Key.
 *
 * ⚠️  NUR in Server Actions und Route Handlers verwenden.
 *     Niemals in Client Components importieren.
 *     SUPABASE_SERVICE_ROLE_KEY darf NICHT NEXT_PUBLIC_ sein.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local'
    )
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
