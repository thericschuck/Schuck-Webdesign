import { assertAdmin } from '@/lib/auth/assert-admin'
import { listAdminAccounts } from '@/lib/auth/invite-admin'
import { InviteAdminForm } from './InviteAdminForm'
import { AdminAccountRow } from './AdminAccountRow'

export default async function TeamPage() {
  const supabase = await assertAdmin()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const accounts = await listAdminAccounts()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Team
        </h1>
        <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Kollegen mit vollem Zugang zum Admin-Backoffice einladen und verwalten.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-lg">
        <h2 className="text-sm font-semibold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Kollegen einladen
        </h2>
        <p className="text-xs text-gray-400 mb-5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Der Eingeladene erhält eine E-Mail zum Einrichten eines eigenen Passworts und hat
          danach exakt denselben Zugang zum Admin-Bereich wie du.
        </p>
        <InviteAdminForm />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 max-w-lg">
        {accounts.length === 0 ? (
          <p className="px-6 py-5 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Noch keine Admin-Accounts.
          </p>
        ) : (
          accounts.map((account) => (
            <AdminAccountRow key={account.id} account={account} isSelf={account.id === user?.id} />
          ))
        )}
      </div>
    </div>
  )
}
