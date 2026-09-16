import { listVaultEntries, listVaultFolders } from '@/lib/domain/vault'
import { VaultBoard } from './VaultBoard'

export default async function VaultPage() {
  const [entries, folders] = await Promise.all([listVaultEntries(), listVaultFolders()])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Passwort-Tresor
        </h1>
        <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Verschlüsselt gespeicherte Zugangsdaten &amp; .env-Dateien – nur für Admins sichtbar. Jede Anzeige wird protokolliert.
        </p>
      </div>

      <VaultBoard entries={entries} folders={folders} />
    </div>
  )
}
