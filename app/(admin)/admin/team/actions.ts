'use server'

import { assertAdmin } from '@/lib/auth/assert-admin'
import { inviteAdminUser, resendAdminInvite, listAdminAccounts, setAdminAccess } from '@/lib/auth/invite-admin'
import { revalidatePath } from 'next/cache'

type Result = { status: 'error'; message: string } | { status: 'success'; message: string }

export async function inviteAdminAction(_prev: Result | null, formData: FormData): Promise<Result> {
  await assertAdmin()

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const fullName = String(formData.get('full_name') ?? '').trim()

  if (!email || !email.includes('@')) {
    return { status: 'error', message: 'Bitte eine gültige E-Mail-Adresse eingeben.' }
  }

  try {
    await inviteAdminUser({ email, fullName })
  } catch (error) {
    console.error('[inviteAdminAction] error:', error instanceof Error ? error.message : error)
    return { status: 'error', message: error instanceof Error ? error.message : 'Einladung fehlgeschlagen.' }
  }

  revalidatePath('/admin/team')
  return { status: 'success', message: `Einladung an ${email} verschickt.` }
}

export async function resendAdminInviteAction(email: string): Promise<Result> {
  await assertAdmin()

  try {
    const kind = await resendAdminInvite(email)
    revalidatePath('/admin/team')
    return {
      status: 'success',
      message:
        kind === 'invite'
          ? `Neue Einladung an ${email} verschickt.`
          : `${email} hat bereits einen Zugang — stattdessen wurde ein Link zum Passwort-Zurücksetzen verschickt.`,
    }
  } catch (error) {
    console.error('[resendAdminInviteAction] error:', error instanceof Error ? error.message : error)
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Einladung konnte nicht erneut gesendet werden.',
    }
  }
}

export async function revokeAdminAction(profileId: string): Promise<Result> {
  const supabase = await assertAdmin()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.id === profileId) {
    return { status: 'error', message: 'Du kannst dir nicht selbst den Zugang entziehen.' }
  }

  const accounts = await listAdminAccounts()
  const otherActive = accounts.filter((a) => a.id !== profileId && a.status !== 'revoked')
  if (otherActive.length === 0) {
    return { status: 'error', message: 'Der letzte aktive Admin-Zugang kann nicht entzogen werden.' }
  }

  try {
    await setAdminAccess(profileId, true)
  } catch (error) {
    console.error('[revokeAdminAction] error:', error instanceof Error ? error.message : error)
    return { status: 'error', message: error instanceof Error ? error.message : 'Zugang konnte nicht entzogen werden.' }
  }

  revalidatePath('/admin/team')
  return { status: 'success', message: 'Zugang entzogen.' }
}

export async function reactivateAdminAction(profileId: string): Promise<Result> {
  await assertAdmin()

  try {
    await setAdminAccess(profileId, false)
  } catch (error) {
    console.error('[reactivateAdminAction] error:', error instanceof Error ? error.message : error)
    return { status: 'error', message: error instanceof Error ? error.message : 'Zugang konnte nicht reaktiviert werden.' }
  }

  revalidatePath('/admin/team')
  return { status: 'success', message: 'Zugang reaktiviert.' }
}
