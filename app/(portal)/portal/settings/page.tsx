import { createClient } from '@/lib/supabase/server'
import { ChangePasswordForm } from './ChangePasswordForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user!.id)
    .single()

  const { data: client } = await supabase
    .from('clients')
    .select('company_name, phone, website, address_street, address_city, address_zip, address_country')
    .eq('profile_id', user!.id)
    .single()

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Einstellungen</h1>
        <p className="text-sm text-gray-500 mt-0.5">Deine Kontodaten und Sicherheit</p>
      </div>

      {/* Meine Daten */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Meine Daten</h2>
          <p className="text-xs text-gray-400 mt-0.5">Änderungen an deinen Stammdaten nimmt Schuck Webdesign für dich vor.</p>
        </div>
        <dl className="px-6 py-4 flex flex-col gap-4">
          <InfoRow label="Name" value={profile?.full_name ?? '—'} />
          <InfoRow label="E-Mail" value={profile?.email ?? '—'} />
          {client?.company_name && <InfoRow label="Firma" value={client.company_name} />}
          {client?.phone && <InfoRow label="Telefon" value={client.phone} />}
          {client?.website && (
            <div className="flex justify-between gap-4">
              <dt className="text-sm text-gray-500 shrink-0">Website</dt>
              <dd className="text-sm text-blue-600 text-right">
                <a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {client.website}
                </a>
              </dd>
            </div>
          )}
          {(client?.address_street || client?.address_city) && (
            <div className="flex justify-between gap-4">
              <dt className="text-sm text-gray-500 shrink-0">Adresse</dt>
              <dd className="text-sm text-gray-800 text-right">
                {client?.address_street && <span className="block">{client.address_street}</span>}
                {(client?.address_zip || client?.address_city) && (
                  <span className="block">
                    {[client.address_zip, client.address_city].filter(Boolean).join(' ')}
                  </span>
                )}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Passwort ändern */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Passwort ändern</h2>
        </div>
        <div className="px-6 py-5">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-sm text-gray-500 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-800 text-right">{value}</dd>
    </div>
  )
}
