'use client'

import { useTransition } from 'react'
import { useToast } from '@/components/admin/ToastProvider'
import { syncAkquiseSheetAction } from './actions'

function fmtDateTime(iso: string | null) {
  if (!iso) return 'noch nie'
  return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function SyncButton({ lastSyncedAt }: { lastSyncedAt: string | null }) {
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  const onSync = () => {
    // Läuft über den globalen Toast (im Admin-Layout, überlebt Seitenwechsel) statt einer
    // Meldung nur auf dieser Seite — man kann während des Syncs frei weiter klicken und wird
    // trotzdem benachrichtigt, egal wo man inzwischen gelandet ist.
    startTransition(async () => {
      const result = await syncAkquiseSheetAction()
      if (result.status === 'error') {
        showToast(`Akquise-Sync fehlgeschlagen: ${result.message}`, 'error')
        return
      }
      const { leadsInserted, leadsUpdated, qualiCallsUpserted, salesCallsUpserted, trackingRowsUpserted, unmapped, sheetErrors, errors } =
        result.result
      const warnings = unmapped.length + sheetErrors.length + errors.length
      const summary =
        `${leadsInserted} neu, ${leadsUpdated} aktualisiert, ${qualiCallsUpserted} Quali-Calls, ${salesCallsUpserted} Sales-Calls, ` +
        `${trackingRowsUpserted} Tracking-Zeilen`

      if (warnings > 0 && leadsInserted + leadsUpdated === 0) {
        showToast(`Akquise-Sync mit Warnungen: ${summary} — ${warnings} Warnung(en), siehe Server-Log`, 'error')
      } else if (warnings > 0) {
        showToast(`Akquise-Daten aktualisiert: ${summary} — ${warnings} Warnung(en), siehe Server-Log`, 'success')
      } else {
        showToast(`Akquise-Daten aktualisiert: ${summary}`, 'success')
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        Zuletzt synchronisiert: {fmtDateTime(lastSyncedAt)}
      </span>
      <button
        type="button"
        onClick={onSync}
        disabled={isPending}
        className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        {isPending ? 'Synchronisiert…' : 'Sheet synchronisieren'}
      </button>
    </div>
  )
}
