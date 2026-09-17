import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AgentRunDetail, AgentStepRow } from '@/app/(admin)/admin/helm/cockpit/types'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await assertAdmin()
  const { id } = await params
  const admin = createAdminClient()

  const [{ data: run, error: runError }, { data: steps, error: stepsError }] = await Promise.all([
    admin.from('agent_runs').select('*, agents(name)').eq('id', id).maybeSingle(),
    admin.from('agent_steps').select('*').eq('run_id', id).order('seq', { ascending: true }),
  ])

  if (runError) throw new Error(runError.message)
  if (stepsError) throw new Error(stepsError.message)
  if (!run) return NextResponse.json({ error: 'Run nicht gefunden.' }, { status: 404 })

  const agent = Array.isArray(run.agents) ? run.agents[0] : run.agents

  const detail: AgentRunDetail = {
    id: run.id,
    agentLabel: agent?.name ?? null,
    parentRunId: run.parent_run_id,
    trigger: run.trigger,
    task: run.task,
    status: run.status,
    significance: run.significance,
    result: run.result,
    error: run.error,
    startedAt: run.started_at,
    endedAt: run.ended_at,
    steps: (steps ?? []).map(
      (step): AgentStepRow => ({
        id: step.id,
        seq: step.seq,
        type: step.type,
        toolSlug: step.tool_slug,
        input: step.input,
        output: step.output,
        status: step.status,
        durationMs: step.duration_ms,
        retryCount: step.retry_count,
      })
    ),
  }

  return NextResponse.json(detail)
}
