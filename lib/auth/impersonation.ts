import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Kundenansicht ("Impersonation") — der Admin wechselt für einen Moment in die echte
 * Portal-Session eines Kunden und sieht exakt das, was der Kunde sieht.
 *
 * Warum eine ECHTE Session und keine "Admin sieht Kundendaten"-Sonderansicht:
 * das Portal hängt durchgängig an `auth.uid()` (RLS-Policies auf `documents`,
 * `projects`, sogar Storage-Ordner-Policies). Eine Sonderansicht müsste jede dieser
 * Regeln nachbauen und würde damit genau die Fehler verstecken, die man mit einer
 * Kundenansicht finden will. Stattdessen wird über die Admin-API ein Magic-Link-Token
 * erzeugt und serverseitig direkt eingelöst (`verifyOtp`) — es wird KEINE E-Mail
 * versendet, `generateLink` liefert das Token nur zurück.
 *
 * Rückweg: der Refresh-Token der Admin-Session wird vorher in einem httpOnly-Cookie
 * geparkt und beim Verlassen der Kundenansicht wieder eingelöst — Eric muss sich also
 * nicht neu einloggen. Solange das Cookie gesetzt ist, zeigt das Portal-Layout ein
 * Hinweisbanner (`components/portal/ImpersonationBanner.tsx`).
 */

export const IMPERSONATION_COOKIE = 'sw_impersonation'

export interface ImpersonationState {
  /** Refresh-Token der Admin-Session, mit dem der Rückweg gebaut wird. */
  adminRefreshToken: string
  /** Anzeigename des Kunden — nur fürs Banner. */
  clientLabel: string
  /** Kunden-ID, damit das Banner zurück auf die Detailseite verlinken kann. */
  clientId: string
}

const MAX_AGE_SECONDS = 60 * 60 * 8

export async function readImpersonationState(): Promise<ImpersonationState | null> {
  const raw = (await cookies()).get(IMPERSONATION_COOKIE)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ImpersonationState>
    if (!parsed.adminRefreshToken || !parsed.clientId) return null
    return {
      adminRefreshToken: parsed.adminRefreshToken,
      clientLabel: parsed.clientLabel || 'Kunde',
      clientId: parsed.clientId,
    }
  } catch {
    return null
  }
}

async function writeImpersonationState(state: ImpersonationState): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(IMPERSONATION_COOKIE, JSON.stringify(state), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function clearImpersonationState(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(IMPERSONATION_COOKIE)
}

export type StartImpersonationResult = { status: 'error'; message: string } | { status: 'success' }

/**
 * Wechselt die Session des aktuellen Browsers auf den Portal-Account des Kunden.
 * Der Aufrufer MUSS vorher `assertAdmin()` ausgeführt haben.
 */
export async function beginImpersonation(clientId: string): Promise<StartImpersonationResult> {
  const supabase = await createClient()

  // Admin-Refresh-Token sichern, BEVOR die Cookies überschrieben werden.
  const { data: { session } } = await supabase.auth.getSession()
  const adminRefreshToken = session?.refresh_token
  if (!adminRefreshToken) {
    return { status: 'error', message: 'Aktuelle Admin-Session konnte nicht gesichert werden. Bitte neu einloggen.' }
  }

  const adminClient = createAdminClient()

  const { data: client } = await adminClient
    .from('clients')
    .select('id, company_name, contact_name, profile_id, profiles(email, full_name, role)')
    .eq('id', clientId)
    .single()

  if (!client) return { status: 'error', message: 'Kunde nicht gefunden.' }

  const profile = Array.isArray(client.profiles) ? client.profiles[0] : client.profiles
  if (!client.profile_id || !profile?.email) {
    return { status: 'error', message: 'Dieser Kunde hat noch keinen Portal-Zugang.' }
  }
  if (profile.role === 'admin') {
    return { status: 'error', message: 'Dieser Account ist selbst ein Admin-Account.' }
  }

  // Ein noch nicht bestätigter Invite darf nicht durch die Kundenansicht "verbraucht"
  // werden — das Einlösen eines Magic-Link-Tokens würde die E-Mail bestätigen und den
  // Einladungs-Flow (/auth/set-password) für den Kunden unbrauchbar machen.
  const { data: authUser } = await adminClient.auth.admin.getUserById(client.profile_id)
  if (!authUser?.user?.email_confirmed_at) {
    return {
      status: 'error',
      message: 'Der Kunde hat seinen Portal-Zugang noch nicht aktiviert — die Kundenansicht würde die Einladung entwerten.',
    }
  }

  const { data: link, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: profile.email,
  })
  if (linkError || !link?.properties?.hashed_token) {
    return { status: 'error', message: `Kundenansicht fehlgeschlagen: ${linkError?.message ?? 'kein Token erhalten'}` }
  }

  // Löst das Token serverseitig ein → schreibt die Session-Cookies des KUNDEN.
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.properties.hashed_token,
  })
  if (verifyError) {
    return { status: 'error', message: `Kundenansicht fehlgeschlagen: ${verifyError.message}` }
  }

  await writeImpersonationState({
    adminRefreshToken,
    clientId: client.id,
    clientLabel: profile.full_name || client.contact_name || client.company_name || profile.email,
  })

  return { status: 'success' }
}

/**
 * Beendet die Kundenansicht und stellt die Admin-Session wieder her.
 * Gibt das Ziel zurück, zu dem redirected werden soll.
 */
export async function endImpersonation(): Promise<string> {
  const state = await readImpersonationState()
  await clearImpersonationState()
  if (!state) return '/admin/dashboard'

  const supabase = await createClient()
  const { error } = await supabase.auth.refreshSession({ refresh_token: state.adminRefreshToken })

  if (error) {
    // Admin-Session nicht mehr wiederherstellbar (z.B. abgelaufen) — dann lieber sauber
    // ausloggen als in der Kundensession hängen zu bleiben.
    await supabase.auth.signOut()
    return '/login'
  }

  return `/admin/clients/${state.clientId}`
}
