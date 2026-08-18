import * as financeDomain from '@/lib/domain/finance'
import { CompanySettingsForm } from './CompanySettingsForm'
import { FinanzenTabs } from '../FinanzenTabs'

export default async function FinanceSettingsPage() {
  const settings = await financeDomain.getCompanySettings()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Firmenstammdaten
        </h1>
        <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Wird als Absenderdaten auf jeder neuen Rechnung verwendet.
        </p>
      </div>

      <FinanzenTabs />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-3xl">
        <CompanySettingsForm settings={settings} />
      </div>
    </div>
  )
}
