import { assertAdmin } from '@/lib/auth/assert-admin'
import * as notificationsDomain from '@/lib/domain/notifications'
import { NotificationSettingsForm } from '@/components/notifications/NotificationSettingsForm'

export default async function AdminEinstellungenPage() {
  const supabase = await assertAdmin()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const prefs = await notificationsDomain.getPreferences(user!.id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Einstellungen
        </h1>
        <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Persönliche Einstellungen für dein Konto.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-lg">
        <h2 className="text-sm font-semibold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Benachrichtigungen
        </h2>
        <p className="text-xs text-gray-400 mb-5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Erinnerungen von JARVIS zu fälligen To-Dos und wichtigen Ereignissen.
        </p>
        <NotificationSettingsForm initialPushEnabled={prefs.pushEnabled} initialEmailEnabled={prefs.emailEnabled} />
      </div>
    </div>
  )
}
