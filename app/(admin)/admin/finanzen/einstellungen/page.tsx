import Link from 'next/link'
import * as financeDomain from '@/lib/domain/finance'
import { CompanySettingsForm } from './CompanySettingsForm'

export default async function FinanceSettingsPage() {
  const settings = await financeDomain.getCompanySettings()

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/finanzen" className="hover:text-gray-600 transition-colors">
          Finanzen
        </Link>
        <span>/</span>
        <span className="text-gray-700">Einstellungen</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Firmenstammdaten
        </h1>
        <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Wird als Absenderdaten auf jeder neuen Rechnung verwendet.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-3xl">
        <CompanySettingsForm settings={settings} />
      </div>
    </div>
  )
}
