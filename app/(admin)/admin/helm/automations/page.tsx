import Link from 'next/link'
import { Plus } from 'lucide-react'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { SUBAGENTS } from '@/lib/helm/subagents'
import { HelmTabs } from '@/components/admin/helm/HelmTabs'
import { AutomationsList, type AutomationRow } from './AutomationsList'

const AGENT_LABELS: Record<string, string> = {
  orchestrator: 'Orchestrator',
  ...Object.fromEntries(SUBAGENTS.map((s) => [s.name, s.label])),
}

export default async function HelmAutomationsPage() {
  await assertAdmin()
  const adminClient = createAdminClient()

  const { data: automations } = await adminClient
    .from('helm_automations')
    .select('*')
    .order('created_at', { ascending: false })

  const ids = (automations ?? []).map((a) => a.id)
  const { data: recentRuns } = ids.length
    ? await adminClient
        .from('agent_runs')
        .select('automation_id, status, started_at, significance')
        .in('automation_id', ids)
        .order('started_at', { ascending: false })
    : { data: [] }

  // Nur den jeweils neuesten Lauf pro Automation behalten (recentRuns ist bereits nach
  // started_at absteigend sortiert) — analog RunHistoryTable.tsx#agentNameById-Pattern statt
  // einer eigenen SQL-DISTINCT-ON-Abfrage.
  const lastRunByAutomation = new Map<string, { status: string; started_at: string | null }>()
  for (const run of recentRuns ?? []) {
    if (!run.automation_id || lastRunByAutomation.has(run.automation_id)) continue
    lastRunByAutomation.set(run.automation_id, { status: run.status, started_at: run.started_at })
  }

  const rows: AutomationRow[] = (automations ?? []).map((a) => ({
    id: a.id,
    label: a.label,
    agentLabel: AGENT_LABELS[a.agent_slug] ?? a.agent_slug,
    recurrence: a.recurrence,
    weekday: a.weekday,
    timeOfDay: a.time_of_day,
    status: a.status,
    lastRunAt: a.last_run_at,
    lastRunStatus: lastRunByAutomation.get(a.id)?.status ?? null,
    nextRunAt: a.next_run_at,
  }))

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 md:top-0 md:left-60 overflow-y-auto bg-[#0d0d0d]">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/8 bg-[#0d0d0d]/95 backdrop-blur-md px-6 py-4">
        <HelmTabs />
        <Link
          href="/admin/helm/automations/new"
          className="flex items-center gap-1.5 rounded-lg bg-violet-400/90 hover:bg-violet-400 px-3 py-1.5 text-xs font-medium text-[#0d0d0d] transition-colors"
        >
          <Plus className="size-3.5" />
          Neue Automation
        </Link>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <AutomationsList rows={rows} />
      </div>
    </div>
  )
}
