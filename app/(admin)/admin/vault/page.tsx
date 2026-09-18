import { listVaultEntries, listVaultFolders, listVaultTags } from '@/lib/domain/vault'
import { VaultBoard } from './VaultBoard'

export default async function VaultPage() {
  const [entries, folders, tags] = await Promise.all([listVaultEntries(), listVaultFolders(), listVaultTags()])

  return (
    // Deckelt die vom Layout ab 2xl freigegebene volle Breite wieder — ein Tresor mit
    // drei schmalen Spalten (Ordner/Liste/Details) profitiert nicht von 1800px Breite.
    <div className="flex flex-col gap-6 2xl:max-w-6xl 2xl:mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Passwort-Tresor
        </h1>
        <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Verschlüsselt gespeicherte Zugangsdaten &amp; .env-Dateien – nur für Admins sichtbar. Jede Anzeige wird protokolliert.
        </p>
      </div>

      <VaultBoard entries={entries} folders={folders} tags={tags} />
    </div>
  )
}
