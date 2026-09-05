import { assertAdmin } from '@/lib/auth/assert-admin'
import * as belegeDomain from '@/lib/domain/belege'
import { FinanzenHeader } from '../FinanzenHeader'
import { BelegeBoard } from './BelegeBoard'

export default async function BelegePage() {
  await assertAdmin()
  // Testrechnungen kommen mit und werden im Board über einen Schalter
  // ein-/ausgeblendet — kein Server-Roundtrip pro Filterklick.
  const belege = await belegeDomain.listBelege({ includeTest: true })

  return (
    <div className="flex flex-col gap-6">
      <FinanzenHeader untertitel="Angebote und Rechnungen" />
      <BelegeBoard belege={belege} />
    </div>
  )
}
