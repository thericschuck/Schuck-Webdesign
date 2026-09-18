import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { createAutomation } from '@/lib/helm/actions/automations'
import { AutomationForm } from '../AutomationForm'

export default async function NewAutomationPage() {
  await assertAdmin()

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 md:top-0 md:left-60 overflow-y-auto bg-[#0d0d0d]">
      <div className="mx-auto max-w-lg px-6 py-8">
        <Link href="/admin/helm/automations" className="mb-6 inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="size-3.5" />
          Zurück zu Automationen
        </Link>
        <h1 className="mb-6 text-lg font-semibold text-white" style={{ fontFamily: 'var(--font-playfair)' }}>
          Neue Automation
        </h1>
        <AutomationForm action={createAutomation} submitLabel="Automation anlegen" />
      </div>
    </div>
  )
}
