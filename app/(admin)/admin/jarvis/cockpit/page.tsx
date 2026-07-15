import { CockpitExplorer } from './CockpitExplorer'
import { RunHistoryTable } from './RunHistoryTable'

export default function CockpitPage() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        Orchestrator, Sub-Agenten und ihre Tools — Klick auf einen Knoten für Details.
      </p>

      <CockpitExplorer />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Run-Historie
        </h2>
        <RunHistoryTable />
      </div>
    </div>
  )
}
