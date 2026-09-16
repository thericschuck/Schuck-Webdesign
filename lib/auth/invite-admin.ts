import { createAdminClient } from '@/lib/supabase/admin'
import { authCallbackUrl } from './site-url'

export interface InviteAdminUserInput {
  email: string
  fullName?: string | null
}

export interface InviteAdminUserResult {
  profileId: string
}

/**
 * Team-Einladungs-Flow (Supabase Auth) — Pendant zu invite-client.ts für Kollegen,
 * die vollen Admin-Zugang zum Backoffice bekommen sollen. Setzt role: 'admin' statt
 * 'client' und legt (anders als beim Kunden) keinen clients-Datensatz an.
 */
export async function inviteAdminUser(input: InviteAdminUserInput): Promise<InviteAdminUserResult> {
  const email = input.email.trim().toLowerCase()
  const fullName = input.fullName?.trim() ?? ''

  const adminClient = createAdminClient()

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role: 'admin' },
    redirectTo: authCallbackUrl(),
  })

  if (inviteError) {
    if (inviteError.message.includes('already been registered')) {
      throw new Error(`Für ${email} existiert bereits ein Zugang. Nutze "Erneut einladen" statt einer neuen Einladung.`)
    }
    throw new Error(`Einladung fehlgeschlagen: ${inviteError.message}`)
  }
  if (!invited.user) throw new Error('Kein User von Supabase zurückgegeben.')

  const profileId = invited.user.id

  const { error: upsertError } = await adminClient
    .from('profiles')
    .upsert({ id: profileId, email, role: 'admin', full_name: fullName || null }, { onConflict: 'id' })

  if (upsertError) {
    // Ohne Rolle 'admin' im Profil bliebe der Kollege ein 'client' (Trigger-Default) und
    // würde von der Middleware in den Kundenportal-Bereich umgeleitet — Invite zurückrollen.
    await adminClient.from('profiles').delete().eq('id', profileId)
    await adminClient.auth.admin.deleteUser(profileId)
    throw new Error(`Profil konnte nicht als Admin angelegt werden: ${upsertError.message}`)
  }

  return { profileId }
}

/**
 * Erneut einladen (z.B. abgelaufener Link) — schaltet wie beim Kunden-Pendant automatisch
 * auf Passwort-Reset um, wenn der Account bereits bestätigt ist.
 */
export async function resendAdminInvite(rawEmail: string): Promise<'invite' | 'recovery'> {
  const email = rawEmail.trim().toLowerCase()
  const adminClient = createAdminClient()
  const redirectTo = authCallbackUrl()

  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { role: 'admin' },
    redirectTo,
  })
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

export interface AdminAccount {
  id: string
  email: string
  fullName: string | null
  createdAt: string
  /** pending: Invite noch nicht angenommen · active: eingeloggt-fähig · revoked: Zugang gesperrt (banned) */
  status: 'pending' | 'active' | 'revoked'
}

/**
 * Alle Admin-Profile inkl. Auth-Status. Nutzt pro Profil einen `getUserById`-Call, um
 * `email_confirmed_at`/`banned_until` zu lesen — das steht nicht in `profiles` und ist
 * bei einer kleinen Team-Liste (wenige Admins) vernachlässigbar.
 */
export async function listAdminAccounts(): Promise<AdminAccount[]> {
  const adminClient = createAdminClient()

  const { data: profiles, error } = await adminClient
    .from('profiles')
    .select('id, email, full_name, created_at')
    .eq('role', 'admin')
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Admins konnten nicht geladen werden: ${error.message}`)
  if (!profiles || profiles.length === 0) return []

  const accounts = await Promise.all(
    profiles.map(async (profile): Promise<AdminAccount> => {
      const { data: authUser } = await adminClient.auth.admin.getUserById(profile.id)
      const u = authUser?.user
      const banned = !!u?.banned_until && new Date(u.banned_until) > new Date()
      const status: AdminAccount['status'] = banned ? 'revoked' : u?.email_confirmed_at ? 'active' : 'pending'

      return {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        createdAt: profile.created_at,
        status,
      }
    })
  )

  return accounts
}

/**
 * Sperrt/entsperrt den Auth-Zugang eines Admins, ohne den User oder sein Profil zu löschen.
 * Ein Hard-Delete würde an FKs scheitern (bzw. Kaskaden auslösen), sobald der Admin bereits
 * Dokumente hochgeladen, JARVIS-Runs ausgelöst o.ä. hat — Sperren ist reversibel und sicher.
 */
export async function setAdminAccess(profileId: string, revoke: boolean): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(profileId, {
    ban_duration: revoke ? '876000h' : 'none',
  })
  if (error) {
    throw new Error(`Zugang konnte nicht ${revoke ? 'entzogen' : 'reaktiviert'} werden: ${error.message}`)
  }
}
