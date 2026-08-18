import * as akquiseDomain from '@/lib/domain/akquise'
import { AkquiseTabs } from '../AkquiseTabs'
import { TrackingBoard } from './TrackingBoard'

export default async function AkquiseTrackingPage() {
  // 60 Tage auf einmal laden — Personen-Filter und Zeitraum laufen clientseitig
  // im Board, kein Server-Roundtrip pro Klick mehr nötig.
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - 59)

  const rows = await akquiseDomain.listAkquiseTracking({ fromDate: fromDate.toISOString().slice(0, 10) })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Akquise
        </h1>
        <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Wählversuche, Gespräche und Termine aus dem Google Sheet („Akquise-Tracking“) — Eintragen dort, hier nur Auswertung.
        </p>
      </div>

      <AkquiseTabs />

      <TrackingBoard rows={rows} />
    </div>
  )
}
