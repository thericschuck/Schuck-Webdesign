import Link from 'next/link'
import { assertAdmin } from '@/lib/auth/assert-admin'
import * as financeDomain from '@/lib/domain/finance'
import { CompanySettingsForm } from './CompanySettingsForm'
import { VorlagenVorschau } from './VorlagenVorschau'

const FONT = { fontFamily: 'var(--font-dm-sans)' } as const

/**
 * Konfiguration des Finanzen-Bereichs — Firmenstammdaten und Dokumentvorlage
 * auf einer Seite.
 *
 * Beides lag vorher als eigener Tab gleichrangig neben der täglichen Arbeit,
 * obwohl man es einmal einrichtet und danach kaum wieder anfasst (die
 * Stammdaten wurden seit dem ersten Setzen nie geändert). Erreichbar jetzt
 * über das Zahnrad in der Kopfzeile.
 */
export default async function FinanzenEinstellungenPage() {
  await assertAdmin()
  const settings = await financeDomain.getCompanySettings()

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <nav className="flex items-center gap-2 text-sm text-gray-400" style={FONT}>
          <Link href="/admin/finanzen" className="hover:text-gray-600 transition-colors">
            Finanzen
          </Link>
          <span>/</span>
          <span className="text-gray-700">Einstellungen</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900 mt-2" style={{ fontFamily: 'var(--font-playfair)' }}>
          Einstellungen
        </h1>
        <p className="text-gray-500 text-sm" style={FONT}>
          Firmenstammdaten und Layout der Dokumente
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900" style={FONT}>
            Firmenstammdaten
          </h2>
          <p className="text-xs text-gray-400 mt-0.5" style={FONT}>
            Absenderzeile, Fußzeile und Signatur jedes Angebots und jeder Rechnung. Der
            Kleinunternehmer-Status wird pro Rechnung eingefroren — eine Änderung hier wirkt nur auf neue
            Dokumente.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-3xl">
          <CompanySettingsForm settings={settings} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900" style={FONT}>
            Dokumentvorlage
          </h2>
          <p className="text-xs text-gray-400 mt-0.5" style={FONT}>
            So sehen Angebot und Rechnung aus. Die Beispieldaten sind absichtlich unangenehm gewählt —
            überlange Firmennamen, mehrzeilige Positionen, mehrseitiger Schlusstext. Bricht es hier sauber
            um, hält es auch echte Kundendaten aus.
          </p>
        </div>
        <VorlagenVorschau />
      </section>
    </div>
  )
}
