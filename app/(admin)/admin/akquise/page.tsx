import * as akquiseDomain from '@/lib/domain/akquise'
import { AkquiseBoard } from './AkquiseBoard'
import { AkquiseTabs } from './AkquiseTabs'
import { SyncButton } from './SyncButton'

// Der Cron läuft nachts einmal — 36h Toleranz lässt einen vollen Tag plus Puffer zu,
// bevor wir "der Sync hängt vermutlich" annehmen (z.B. Cron schlägt seit Tagen fehl,
// ohne dass es jemand merkt).
const STALE_SYNC_MS = 36 * 60 * 60 * 1000

export default async function AkquisePage() {
  // Alles auf einmal laden — Suche, Filter und Kanban/Tabelle-Umschalter laufen
  // komplett clientseitig im Board, kein Server-Roundtrip pro Klick mehr nötig.
  const [leads, lastSyncedAt, lastSyncMessage] = await Promise.all([
    akquiseDomain.listLeads({}),
    akquiseDomain.getLastSheetSyncAt(),
    akquiseDomain.getLastSyncMessage(),
  ])

  const isStale = !lastSyncedAt || new Date().getTime() - new Date(lastSyncedAt).getTime() > STALE_SYNC_MS
  // summarizeResult() hängt Detailzeilen nur an, wenn es Warnungen gab — ein Zeilenumbruch
  // in der Nachricht ist also das Signal, dass es etwas zu zeigen gibt.
  const hasSyncIssues = !!lastSyncMessage && (!lastSyncMessage.success || !!lastSyncMessage.message?.includes('\n'))

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Akquise
        </h1>
        <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {leads.length} {leads.length === 1 ? 'Lead' : 'Leads'} insgesamt
        </p>
      </div>

      <AkquiseTabs />

      {isStale && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-1.5a9 9 0 11-18 0 9 9 0 0118 0zM12 15.75h.007" />
          </svg>
          <p className="text-sm text-amber-800" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {lastSyncedAt
              ? 'Der letzte Sheet-Sync liegt mehr als 36 Stunden zurück — der nächtliche Cron-Job könnte fehlschlagen. Jetzt manuell synchronisieren oder /admin/integrationen prüfen.'
              : 'Es wurde noch nie erfolgreich synchronisiert. Auf "Sheet synchronisieren" klicken oder /admin/integrationen prüfen.'}
          </p>
        </div>
      )}

      {/* Sheet-Sync */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Lead-Stammdaten, Ergebnisse und Tracking kommen aus dem Google Sheet — Bearbeitung dort, hier nur Auswertung.
        </p>
        <SyncButton lastSyncedAt={lastSyncedAt} />
      </div>

      {hasSyncIssues && lastSyncMessage && (
        <details className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <summary
            className="px-4 py-3 cursor-pointer select-none flex items-center gap-2 text-sm font-medium text-amber-800 hover:bg-amber-50 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-1.5a9 9 0 11-18 0 9 9 0 0118 0zM12 15.75h.007" />
            </svg>
            {lastSyncMessage.success ? 'Warnungen beim letzten Sync' : 'Letzter Sync fehlgeschlagen'}
          </summary>
          <pre
            className="px-4 pb-4 text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {lastSyncMessage.message}
          </pre>
        </details>
      )}

      <AkquiseBoard leads={leads} />
    </div>
  )
}
