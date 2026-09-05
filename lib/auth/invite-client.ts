import { createAdminClient } from '@/lib/supabase/admin'
import { authCallbackUrl } from './site-url'

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
    redirectTo: authCallbackUrl(),
  })

  if (inviteError) {
    if (inviteError.message.includes('already been registered')) {
      throw new Error(
        `Für ${email} existiert bereits ein Portal-Zugang. Nutze beim betreffenden Kunden ` +
          '"Erneut einladen" statt einer neuen Einladung.'
      )
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

/**
 * Macht einen bereits verschickten Invite rückgängig, wenn das Anlegen des Kunden
 * danach fehlschlägt. Ohne diesen Rollback bliebe ein auth-User ohne Kundendatensatz
 * zurück und JEDER weitere Einladungsversuch für dieselbe Adresse liefe in
 * "bereits registriert" — eine Sackgasse, die nur per Supabase-Dashboard auflösbar wäre.
 */
export async function rollbackInvitedUser(profileId: string): Promise<void> {
  try {
    const adminClient = createAdminClient()
    await adminClient.from('profiles').delete().eq('id', profileId)
    await adminClient.auth.admin.deleteUser(profileId)
  } catch (error) {
    console.error('[invite-client] Rollback fehlgeschlagen:', error instanceof Error ? error.message : error)
  }
}

export type ResendKind = 'invite' | 'recovery'

/**
 * Erneut einladen (z.B. abgelaufener Link) — sendet nur die E-Mail, ohne neuen Profil-Eintrag.
 *
 * GoTrue lehnt `inviteUserByEmail` ab, sobald der Account bestätigt ist ("already been
 * registered"). Genau dann braucht der Kunde aber keinen Invite, sondern einen
 * Passwort-Reset. Statt in eine Sackgasse zu laufen, wird hier automatisch umgeschaltet
 * und dem Aufrufer zurückgegeben, was tatsächlich verschickt wurde.
 */
export async function resendClientInvite(rawEmail: string): Promise<ResendKind> {
  const email = rawEmail.trim().toLowerCase()
  const adminClient = createAdminClient()
  const redirectTo = authCallbackUrl()

  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, { redirectTo })
  if (!error) return 'invite'

  const alreadyActive =
    error.message.includes('already been registered') || error.message.includes('already registered')

  if (!alreadyActive) {
    throw new Error(`Einladung konnte nicht erneut gesendet werden: ${error.message}`)
  }

  const { error: resetError } = await adminClient.auth.resetPasswordForEmail(email, { redirectTo })
  if (resetError) {
    throw new Error(`Passwort-Link konnte nicht gesendet werden: ${resetError.message}`)
  }
  return 'recovery'
}
