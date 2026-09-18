import { streamText, stepCountIs, type ModelMessage, type SystemModelMessage, type ToolSet } from 'ai'
import type { ToolExecuteContext } from '../catalog/types'
import { anthropic } from '@ai-sdk/anthropic'
import { buildHelmSystemMessages, buildHelmOverrideSystemMessage, type PageContext, type ToolCatalogInfo } from './system-prompt'
import { getColdStartContext, getPromptContext } from './context'
import { HELM_COLD_START_TRIGGER, MAX_STEPS } from './constants'
import { SUBAGENTS } from '../subagents'
import { startAgentRun, resumeAgentRun, finalizeAgentRun, startToolCallStep, finishToolCallStep } from './observability'
import { supportsThinking } from '../catalog/models'
import { effortBudgetTokens, type HelmEffort } from '../settings'
import type { Json } from '@/types/database'

const SUBAGENT_NAMES = new Set(SUBAGENTS.map((def) => def.name))

// modelOverride kommt von Sub-Agenten-Aufrufen, die agents.model aus der DB gelesen haben
// (lib/helm/delegate.ts#buildScopedRegistry) — Cockpit-Bearbeitung ("Modell wechseln")
// wirkt sich damit tatsächlich aus. Der Haupt-Orchestrator übergibt keinen Override und
// bleibt beim Fallback.
function resolveModel(modelOverride?: string | null) {
  return modelOverride || process.env.HELM_MODEL || 'claude-sonnet-5'
}

function extractText(content: ModelMessage['content']): string | null {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const text = content
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join('')
    return text || null
  }
  return null
}

function computeSignificance(input: {
  calledAnyTool: boolean
  calledSubAgentTool: boolean
  hadConfirmationProposal: boolean
  failed: boolean
}): 'trivial' | 'normal' | 'notable' {
  if (input.calledSubAgentTool || input.hadConfirmationProposal || input.failed) return 'notable'
  if (input.calledAnyTool) return 'normal'
  return 'trivial'
}

export interface RunHelmAgentOptions {
  messages: ModelMessage[]
  /** Baut die AI-SDK-Tool-Map für DIESEN Lauf — erst aufgerufen, NACHDEM run_id bekannt ist
   * (siehe unten), damit Tools (Bestätigungsvorschläge, verschachtelte Sub-Agenten-Aufrufe)
   * die run_id des eigenen Laufs als Kontext bekommen. Vom Aufrufer übergeben (siehe
   * lib/helm/catalog/registry.ts#toAiSdkTools für den Haupt-Orchestrator,
   * lib/helm/catalog/build.ts#buildAiSdkTools für skalierte Sub-Agenten-Registries aus
   * lib/helm/delegate.ts). Bewusst keine Default-Factory hier — core/run.ts importiert
   * weder registry.ts noch delegate.ts, um den Zirkelbezug zu vermeiden, den delegate.ts
   * (das runHelmAgent rekursiv aufruft) sonst mit registry.ts (das delegate.ts einbindet)
   * hätte. */
  buildTools: (context: ToolExecuteContext) => ToolSet
  /** Vorgerenderter Tool-Katalog-Text + Bestätigungspflicht-Slugs für den System-Prompt —
   * vom Aufrufer übergeben (siehe RunHelmAgentOptions.buildTools-Kommentar für die
   * Zirkelbezug-Begründung: system-prompt.ts darf lib/helm/catalog/registry.ts nicht
   * importieren). Nur relevant, wenn kein `systemPrompt`-Override gesetzt ist — bei
   * Sub-Agenten-Aufrufen (die immer einen Override mitgeben) einfach weglassen. */
  toolCatalog?: ToolCatalogInfo
  /** Überschreibt den vollen HELM-System-Prompt — genutzt von Sub-Agenten
   * (lib/helm/delegate.ts), die einen fokussierten, eigenen Prompt bekommen. Wenn gesetzt,
   * werden Cold-Start-Kontext und Wissensgraph-Kontext NICHT ermittelt. */
  systemPrompt?: string
  /** Überschreibt das Modell für diesen Lauf — genutzt von Sub-Agenten. */
  model?: string | null
  /** Denktiefe (Extended-Thinking-Budget) für den Chat-Header-Picker — nur bei Modellen
   * gesetzt, die das unterstützen (siehe lib/helm/catalog/models.ts#supportsThinking).
   * Sub-Agenten-Läufe übergeben das nicht (nutzen die Standard-Denktiefe des Modells). */
  effort?: HelmEffort | null
  pageContext?: PageContext | null
  /** Verlinkt diesen Lauf als Kind eines anderen agent_runs-Eintrags. */
  parentRunId?: string
  /** agents.slug für den agent_runs-Eintrag dieses Laufs. Default 'orchestrator', wenn kein
   * systemPrompt-Override gesetzt ist; Sub-Agenten übergeben ihren eigenen def.name. */
  agentSlug?: string
  /** 'user' (Chat) ist der Default; Sub-Agenten-Aufrufe setzen automatisch 'sub_agent' (über
   * parentRunId), die Automations-Engine übergibt explizit 'automation' + automationId
   * (siehe app/api/cron/helm-automations/route.ts, lib/helm/automations.ts). */
  trigger?: 'user' | 'sub_agent' | 'automation' | 'mention'
  automationId?: string | null
}

/**
 * Baut EINEN streamText()-Lauf inkl. Observability-Wiring (agent_runs/agent_steps) auf und
 * gibt das rohe StreamTextResult zurück — kein hand-geschriebener Loop mehr (ersetzt
 * lib/jarvis/agent.ts komplett): das AI SDK übernimmt Request→Tool-Call→Tool-Result→
 * nächster Request-Zyklus selbst (stopWhen: stepCountIs). Der Aufrufer entscheidet, was mit
 * dem Ergebnis passiert — `.toUIMessageStreamResponse(...)` für den Chat-Endpunkt
 * (app/api/helm/chat/route.ts), `await result.text` für einen synchronen Sub-Agenten-Call
 * (lib/helm/delegate.ts).
 */
export async function runHelmAgent({
  messages,
  buildTools,
  toolCatalog,
  systemPrompt: systemPromptOverride,
  model: modelOverride,
  effort,
  pageContext,
  parentRunId,
  agentSlug,
  trigger,
  automationId,
}: RunHelmAgentOptions) {
  const lastMessage = messages[messages.length - 1]
  const lastUserRawText = lastMessage?.role === 'user' ? extractText(lastMessage.content) : null
  const isColdStart = lastUserRawText === HELM_COLD_START_TRIGGER
  const lastUserText = !isColdStart ? lastUserRawText : null

  const resolvedAgentSlug = agentSlug ?? (systemPromptOverride ? undefined : 'orchestrator')
  const resolvedTrigger = trigger ?? (parentRunId ? 'sub_agent' : 'user')

  let runId: string | null = null
  if (resolvedAgentSlug) {
    runId = await startAgentRun({
      agentSlug: resolvedAgentSlug,
      parentRunId,
      trigger: resolvedTrigger,
      task: lastUserText,
      automationId,
    })
  }

  let systemMessages: SystemModelMessage[]
  if (systemPromptOverride) {
    systemMessages = buildHelmOverrideSystemMessage(systemPromptOverride)
  } else {
    const coldStartContext = isColdStart ? await getColdStartContext() : null
    const knowledgeContext = lastUserText ? await getPromptContext(lastUserText) : null
    systemMessages = buildHelmSystemMessages(
      toolCatalog ?? { text: '', confirmationSlugs: [] },
      coldStartContext,
      knowledgeContext,
      pageContext
    )
  }

  let calledAnyTool = false
  let calledSubAgentTool = false
  let hadConfirmationProposal = false
  let stepSeq = 0

  const tools = buildTools({ runId: runId ?? undefined })
  const resolvedModel = resolveModel(modelOverride)
  const thinkingEnabled = !!effort && supportsThinking(resolvedModel)
  const budgetTokens = thinkingEnabled ? effortBudgetTokens(effort!) : null

  return streamText({
    model: anthropic(resolvedModel),
    // NICHT `messages: [...systemMessages, ...messages]` — diese AI-SDK-Version lehnt
    // role:'system'-Einträge in `messages`/`prompt` standardmäßig ab ("Invalid prompt: System
    // messages are not allowed…", allowSystemInMessages default `false`). `instructions`
    // akzeptiert dieselbe SystemModelMessage[]-Form (inkl. providerOptions für Anthropics
    // Prompt-Caching) — der korrekte, zukunftssichere Weg statt der Reject-Option.
    instructions: systemMessages,
    messages,
    tools,
    stopWhen: stepCountIs(MAX_STEPS),
    ...(budgetTokens
      ? {
          maxOutputTokens: budgetTokens + 4096,
          providerOptions: { anthropic: { thinking: { type: 'enabled', budgetTokens } } },
        }
      : {}),
    onStepFinish: async (step) => {
      if (!runId) return
      const stepUsage = step.usage?.totalTokens ?? null

      for (const toolCall of step.toolCalls ?? []) {
        const toolName = toolCall.toolName
        calledAnyTool = true
        if (SUBAGENT_NAMES.has(toolName)) calledSubAgentTool = true

        const matchingResult = step.toolResults?.find((r) => r.toolCallId === toolCall.toolCallId) as
          | { output?: unknown; isError?: boolean }
          | undefined
        const output = matchingResult?.output ?? null
        if (output && typeof output === 'object' && (output as { status?: unknown }).status === 'pending_confirmation') {
          hadConfirmationProposal = true
        }

        const stepId = await startToolCallStep({
          runId,
          agentSlug: resolvedAgentSlug ?? 'orchestrator',
          seq: ++stepSeq,
          toolSlug: toolName,
          input: toolCall.input as Json,
        })
        if (stepId) {
          await finishToolCallStep({
            stepId,
            status: matchingResult?.isError ? 'error' : 'done',
            output: (output ?? null) as Json,
            durationMs: 0,
            retryCount: 0,
            tokensUsed: stepUsage,
          })
        }
      }
    },
    onFinish: async ({ text }) => {
      if (!runId) return
      await finalizeAgentRun({
        runId,
        status: 'succeeded',
        significance: computeSignificance({ calledAnyTool, calledSubAgentTool, hadConfirmationProposal, failed: false }),
        result: { text } as Json,
      })
    },
    onError: async ({ error }) => {
      if (!runId) return
      await finalizeAgentRun({
        runId,
        status: 'failed',
        significance: computeSignificance({ calledAnyTool, calledSubAgentTool, hadConfirmationProposal, failed: true }),
        error: { message: error instanceof Error ? error.message : 'Unbekannter Fehler' } as Json,
      })
    },
  })
}

// Unter dem entkoppelten Bestätigungsmodell (lib/helm/actions/pending-actions.ts) pausiert
// ein Vorschlag den Modell-Loop nicht mehr — resumeAgentRun bleibt als Observability-
// Baustein bestehen (z.B. für einen künftigen manuellen Retry im Cockpit), wird vom
// aktuellen Chat-Flow aber nicht mehr aufgerufen.
export { resumeAgentRun }
