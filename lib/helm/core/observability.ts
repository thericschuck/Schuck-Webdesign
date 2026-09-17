import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/database'

// ── agent_runs/agent_steps-Logging (Migration 0017/0018) ────────────────────
// Best-effort: jede Funktion hier fängt eigene Fehler ab und loggt nur per
// console.error. Der eigentliche Chat-Flow (lib/helm/core/run.ts) darf davon nie
// unterbrochen werden.

async function resolveAgentId(slug: string): Promise<string | null> {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient.from('agents').select('id').eq('slug', slug).maybeSingle()
    if (error) throw new Error(error.message)
    return data?.id ?? null
  } catch (error) {
    console.error(`[helm/observability] agents-Lookup für Slug "${slug}" fehlgeschlagen:`, error)
    return null
  }
}

export interface StartRunInput {
  agentSlug: string
  parentRunId?: string
  trigger: 'user' | 'sub_agent'
  task?: string | null
}

export async function startAgentRun(input: StartRunInput): Promise<string | null> {
  try {
    const agentId = await resolveAgentId(input.agentSlug)
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('agent_runs')
      .insert({
        agent_id: agentId,
        parent_run_id: input.parentRunId ?? null,
        trigger: input.trigger,
        task: input.task ?? null,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return data.id
  } catch (error) {
    console.error('[helm/observability] agent_runs-Insert fehlgeschlagen:', error)
    return null
  }
}

export async function resumeAgentRun(runId: string): Promise<void> {
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient.from('agent_runs').update({ status: 'running' }).eq('id', runId)
    if (error) throw new Error(error.message)
  } catch (error) {
    console.error('[helm/observability] agent_runs-Resume fehlgeschlagen:', error)
  }
}

export async function markAgentRunWaitingHuman(runId: string): Promise<void> {
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient.from('agent_runs').update({ status: 'waiting_human' }).eq('id', runId)
    if (error) throw new Error(error.message)
  } catch (error) {
    console.error('[helm/observability] agent_runs-Update (waiting_human) fehlgeschlagen:', error)
  }
}

export interface FinalizeRunInput {
  runId: string
  status: 'succeeded' | 'failed'
  significance: 'trivial' | 'normal' | 'notable'
  result?: Json | null
  error?: Json | null
}

export async function finalizeAgentRun(input: FinalizeRunInput): Promise<void> {
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('agent_runs')
      .update({
        status: input.status,
        significance: input.significance,
        result: input.result ?? null,
        error: input.error ?? null,
        ended_at: new Date().toISOString(),
      })
      .eq('id', input.runId)
    if (error) throw new Error(error.message)
  } catch (error) {
    console.error('[helm/observability] agent_runs-Finalize fehlgeschlagen:', error)
  }
}

// ── Steps ─────────────────────────────────────────────────────────────────

export interface StartStepInput {
  runId: string
  agentSlug: string
  seq: number
  toolSlug: string
  input: Json
}

export async function startToolCallStep(input: StartStepInput): Promise<string | null> {
  try {
    const agentId = await resolveAgentId(input.agentSlug)
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('agent_steps')
      .insert({
        run_id: input.runId,
        seq: input.seq,
        type: 'tool_call',
        agent_id: agentId,
        tool_slug: input.toolSlug,
        input: input.input,
        status: 'running',
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return data.id
  } catch (error) {
    console.error('[helm/observability] agent_steps-Insert fehlgeschlagen:', error)
    return null
  }
}

export interface RetryStepInput {
  stepId: string
  input: Json
  retryCount: number
}

/** Setzt einen bereits vorhandenen agent_steps-Eintrag für einen erneuten Versuch
 * desselben Tools zurück auf 'running' — statt einen neuen Step anzuhäufen. */
export async function retryToolCallStep(input: RetryStepInput): Promise<void> {
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('agent_steps')
      .update({ input: input.input, status: 'running', retry_count: input.retryCount })
      .eq('id', input.stepId)
    if (error) throw new Error(error.message)
  } catch (error) {
    console.error('[helm/observability] agent_steps-Retry-Update fehlgeschlagen:', error)
  }
}

export interface FinishStepInput {
  stepId: string
  status: 'done' | 'error'
  output?: Json | null
  durationMs: number
  retryCount: number
  /** Token-Verbrauch des AI-SDK-Steps, in dem dieser Tool-Call entschieden/beantwortet wurde
   * (streamText onStepFinish usage.totalTokens) — JARVIS hat diese Spalte nie befüllt, HELM
   * schreibt sie jetzt (Näherung: ein AI-SDK "step" kann mehrere Tool-Calls enthalten, der
   * Wert ist dann auf jeden dieser Calls repliziert, nicht anteilig aufgeteilt). */
  tokensUsed?: number | null
}

export async function finishToolCallStep(input: FinishStepInput): Promise<void> {
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('agent_steps')
      .update({
        status: input.status,
        output: input.output ?? null,
        duration_ms: input.durationMs,
        retry_count: input.retryCount,
        ...(input.tokensUsed != null ? { tokens_used: input.tokensUsed } : {}),
      })
      .eq('id', input.stepId)
    if (error) throw new Error(error.message)
  } catch (error) {
    console.error('[helm/observability] agent_steps-Update fehlgeschlagen:', error)
  }
}
