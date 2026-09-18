import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateAutomation } from '@/lib/helm/actions/automations'
import { AutomationForm } from '../../AutomationForm'

export default async function EditAutomationPage({ params }: { params: Promise<{ id: string }> }) {
  await assertAdmin()
  const { id } = await params

  const adminClient = createAdminClient()
  const { data: automation } = await adminClient.from('helm_automations').select('*').eq('id', id).maybeSingle()
  if (!automation) notFound()

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 md:top-0 md:left-60 overflow-y-auto bg-[#0d0d0d]">
      <div className="mx-auto max-w-lg px-6 py-8">
        <Link href="/admin/helm/automations" className="mb-6 inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="size-3.5" />
          Zurück zu Automationen
        </Link>
        <h1 className="mb-6 text-lg font-semibold text-white" style={{ fontFamily: 'var(--font-playfair)' }}>
          Automation bearbeiten
        </h1>
        <AutomationForm
          action={updateAutomation.bind(null, id)}
          submitLabel="Änderungen speichern"
          initial={{
            label: automation.label,
            agentSlug: automation.agent_slug,
            task: automation.task,
            recurrence: automation.recurrence,
            weekday: automation.weekday,
            timeOfDay: automation.time_of_day,
          }}
        />
      </div>
    </div>
  )
}
