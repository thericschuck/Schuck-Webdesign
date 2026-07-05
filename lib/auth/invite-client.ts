import { createAdminClient } from '@/lib/supabase/admin'

export interface InviteClientUserInput {
  email: string
  fullName?: string | null
}

export interface InviteClientUserResult {
  profileId: string
}

/**
 * Portal-Einladungs-Flow (Supabase Auth) — bewusst eigenständig und NICHT Teil
 * von lib/domain/clients.ts: sendet eine echte E-Mail und legt den auth.users-
 * Eintrag an. Domain-Funktionen bleiben dadurch frei von Seiteneffekten wie
 * E-Mail-Versand und sind unabhängig davon testbar.
 *
 * Aufrufer (Server Actions, JARVIS-Tools) rufen dies zuerst auf, um eine
 * profileId zu erhalten, und übergeben diese anschließend an
 * lib/domain/clients.ts → createClient().
 */
export async function inviteClientUser(input: InviteClientUserInput): Promise<InviteClientUserResult> {
  const email = input.email.trim().toLowerCase()
  const fullName = input.fullName?.trim() ?? ''

  const adminClient = createAdminClient()

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role: 'client' },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  })

  if (inviteError) {
    if (inviteError.message.includes('already been registered')) {
      throw new Error('Diese E-Mail ist bereits registriert.')
    }
    throw new Error(`Einladung fehlgeschlagen: ${inviteError.message}`)
  }
  if (!invited.user) throw new Error('Kein User von Supabase zurückgegeben.')

  const profileId = invited.user.id

  await adminClient
    .from('profiles')
    .upsert({ id: profileId, email, role: 'client', full_name: fullName || null }, { onConflict: 'id' })

  return { profileId }
}

/** Erneut einladen (z.B. abgelaufener Link) — sendet nur die E-Mail, ohne neuen Profil-Eintrag. */
export async function resendClientInvite(email: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  })
  if (error) throw new Error(`Einladung konnte nicht erneut gesendet werden: ${error.message}`)
}
