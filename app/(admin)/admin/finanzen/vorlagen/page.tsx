import { assertAdmin } from '@/lib/auth/assert-admin'
import { FinanzenTabs } from '../FinanzenTabs'
import { VorlagenVorschau } from './VorlagenVorschau'

export default async function VorlagenPage() {
  await assertAdmin()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Vorlagen
        </h1>
        <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Layout von Angebot und Rechnung — Vorschau mit Stresstest-Daten
        </p>
      </div>

      <FinanzenTabs />

      <VorlagenVorschau />
    </div>
  )
}
