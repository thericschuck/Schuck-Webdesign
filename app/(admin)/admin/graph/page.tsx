import { GraphExplorer } from './GraphExplorer'

export default function GraphPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          System-Graph
        </h1>
        <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Explorative Ansicht — bearbeitet wird auf den jeweiligen Detailseiten.
        </p>
      </div>
      <GraphExplorer />
    </div>
  )
}
