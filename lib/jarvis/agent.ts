import Anthropic from '@anthropic-ai/sdk'
import { buildJarvisSystemPrompt, type PageContext } from './system-prompt'
import { getColdStartContext, getPromptContext } from './context'
import { JARVIS_COLD_START_TRIGGER } from './constants'
import { toolRegistry as defaultToolRegistry } from './tools'
import { SUBAGENTS } from './subagents'
import { IntegrationError } from '@/lib/integrations/errors'
import {
  startAgentRun,
  resumeAgentRun,
  markAgentRunWaitingHuman,
  finalizeAgentRun,
  startToolCallStep,
  retryToolCallStep,
  finishToolCallStep,
} from './observability'
import type { ToolRegistry } from './tool-types'
import type { Json } from '@/types/database'

export type { JarvisTool, ToolRegistry } from './tool-types'
export { toolRegistry } from './tools'

const MAX_ITERATIONS = 10
const MAX_TOOL_RETRIES = 3
const SUBAGENT_NAMES = new Set(SUBAGENTS.map((def) => def.name))

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

function getModel() {
  return process.env.JARVIS_MODEL || 'claude-sonnet-5'
}

function isColdStartTrigger(message: Anthropic.MessageParam | undefined): boolean {
  if (!message || message.role !== 'user') return false
  return typeof message.content === 'string' && message.content === JARVIS_COLD_START_TRIGGER
}

function getLastUserText(message: Anthropic.MessageParam | undefined): string | null {
  if (!message || message.role !== 'user') return null
  return typeof message.content === 'string' ? message.content : null
}

function computeSignificance(input: {
  calledAnyTool: boolean
  calledSubAgentTool: boolean
  hadConfirmation: boolean
  failed: boolean
}): 'trivial' | 'normal' | 'notable' {
  if (input.calledSubAgentTool || input.hadConfirmation || input.failed) return 'notable'
  if (input.calledAnyTool) return 'normal'
  return 'trivial'
}

// ── Agent-Loop ──────────────────────────────────────────────────────────────

export interface RunJarvisAgentOptions {
  messages: Anthropic.MessageParam[]
  tools?: ToolRegistry
  /**
   * Überschreibt den vollen JARVIS-System-Prompt — genutzt von Sub-Agenten
   * (lib/jarvis/tools/subagents.ts), die einen fokussierten, eigenen Prompt
   * bekommen. Wenn gesetzt, werden Cold-Start-Kontext und Wissensgraph-Kontext
   * NICHT ermittelt (sparen sich die OpenAI-Embedding-Anfrage + Graph-
   * Traversal, deren Ergebnis sonst ungenutzt verworfen würde).
   */
  systemPrompt?: string
  /** Automatisch ermittelter Kontext zur gerade geöffneten Admin-Seite (Widget) — fließt nur
   * in den selbst gebauten System-Prompt ein, nicht in einen `systemPrompt`-Override. */
  pageContext?: PageContext | null
  onTextDelta?: (text: string) => void
  /** Verlinkt diesen Lauf als Kind eines anderen agent_runs-Eintrags — von
   * buildSubAgentTool() (lib/jarvis/tools/subagents.ts) über den execute()-Context
   * mit der run_id des delegierenden Orchestrator-Laufs befüllt. */
  parentRunId?: string
  /** agents.slug für den agent_runs-Eintrag dieses Laufs. Default 'orchestrator',
   * wenn kein systemPrompt-Override gesetzt ist; Sub-Agenten übergeben ihren
   * eigenen def.name (buildSubAgentTool()). */
  agentSlug?: string
  /** Setzt einen bestehenden agent_runs-Eintrag fort (Fortsetzung nach einer
   * Bestätigung über /api/jarvis/confirm) statt einen neuen anzulegen — siehe
   * app/api/jarvis/confirm/route.ts + lib/jarvis/stream.ts. Ein gesetzter Wert
   * bedeutet außerdem: dieser Lauf enthielt bereits einen Bestätigungsschritt,
   * relevant für die significance-Berechnung am Ende. */
  existingRunId?: string
}

export type JarvisAgentResult =
  | { type: 'final'; text: string }
  | {
      type: 'confirmation_required'
      toolName: string
      toolArgs: Record<string, unknown>
      toolUseId: string
      conversation: Anthropic.MessageParam[]
      /** run_id des pausierten Laufs (für pending_actions.run_id + spätere
       * Fortsetzung über existingRunId) — null, wenn das Observability-Logging
       * selbst fehlgeschlagen ist. */
      runId: string | null
      /** step_id des agent_steps-Eintrags für genau diesen Tool-Call — für
       * pending_actions.step_id, damit /api/jarvis/confirm ihn abschließen kann. */
      stepId: string | null
    }

export async function runJarvisAgent({
  messages,
  tools = defaultToolRegistry,
  systemPrompt: systemPromptOverride,
  pageContext,
  onTextDelta,
  parentRunId,
  agentSlug,
  existingRunId,
}: RunJarvisAgentOptions): Promise<JarvisAgentResult> {
  const client = getClient()
  const conversation: Anthropic.MessageParam[] = [...messages]
  const toolFailureCounts = new Map<string, number>()
  const toolStepIds = new Map<string, string>()

  const lastMessage = messages[messages.length - 1]
  const isColdStart = isColdStartTrigger(lastMessage)
  const lastUserText = !isColdStart ? getLastUserText(lastMessage) : null

  const resolvedAgentSlug = agentSlug ?? (systemPromptOverride ? undefined : 'orchestrator')

  // ── Observability: Run anlegen bzw. fortsetzen ──────────────────────────
  let runId: string | null = existingRunId ?? null
  if (existingRunId) {
    await resumeAgentRun(existingRunId)
  } else if (resolvedAgentSlug) {
    runId = await startAgentRun({
      agentSlug: resolvedAgentSlug,
      parentRunId,
      trigger: parentRunId ? 'sub_agent' : 'user',
      task: lastUserText,
    })
  }

  let calledAnyTool = false
  let calledSubAgentTool = false
  const hadConfirmation = Boolean(existingRunId)
  let stepSeq = 0

  let systemPrompt = systemPromptOverride
  if (!systemPrompt) {
    const coldStartContext = isColdStart ? await getColdStartContext() : null
    const knowledgeContext = lastUserText ? await getPromptContext(lastUserText) : null
    systemPrompt = buildJarvisSystemPrompt(coldStartContext, knowledgeContext, pageContext)
  }

  let finalText = ''

  try {
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const toolDefinitions = Array.from(tools.values()).map((tool) => tool.definition)

      const stream = client.messages.stream({
        model: getModel(),
        max_tokens: 4096,
        system: systemPrompt,
        messages: conversation,
        ...(toolDefinitions.length > 0 ? { tools: toolDefinitions } : {}),
      })

      if (onTextDelta) {
        stream.on('text', (textDelta) => onTextDelta(textDelta))
      }

      const response = await stream.finalMessage()

      finalText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')

      conversation.push({ role: 'assistant', content: response.content })

      if (response.stop_reason !== 'tool_use') {
        if (runId) {
          await finalizeAgentRun({
            runId,
            status: 'succeeded',
            significance: computeSignificance({ calledAnyTool, calledSubAgentTool, hadConfirmation, failed: false }),
            result: { text: finalText } as Json,
          })
        }
        return { type: 'final', text: finalText }
      }

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      )

      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of toolUseBlocks) {
        const tool = tools.get(block.name)

        if (!tool) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Tool "${block.name}" ist nicht registriert.`,
            is_error: true,
          })
          continue
        }

        if (tool.requiresConfirmation) {
          // Human-in-the-Loop: Ausführung pausieren. Die Route persistiert
          // "conversation" (inkl. dieser Assistant-Nachricht mit dem
          // tool_use-Block) als pending_action und setzt den Loop erst nach
          // Erics Entscheidung über /api/jarvis/confirm fort.
          let stepId: string | null = null
          if (runId) {
            stepId = await startToolCallStep({
              runId,
              agentSlug: resolvedAgentSlug ?? 'orchestrator',
              seq: ++stepSeq,
              toolSlug: tool.name,
              input: block.input as Json,
            })
            await markAgentRunWaitingHuman(runId)
          }
          return {
            type: 'confirmation_required',
            toolName: tool.name,
            toolArgs: block.input as Record<string, unknown>,
            toolUseId: block.id,
            conversation,
            runId,
            stepId,
          }
        }

        calledAnyTool = true
        if (SUBAGENT_NAMES.has(tool.name)) calledSubAgentTool = true

        // Observability: bei einem Retry (dasselbe Tool ist in diesem Lauf schon
        // einmal fehlgeschlagen) den bestehenden Step wiederverwenden statt einen
        // neuen anzuhäufen — siehe toolStepIds.
        let stepId = toolStepIds.get(tool.name) ?? null
        const attemptRetryCount = toolFailureCounts.get(tool.name) ?? 0
        if (runId) {
          if (stepId) {
            await retryToolCallStep({ stepId, input: block.input as Json, retryCount: attemptRetryCount })
          } else {
            stepId = await startToolCallStep({
              runId,
              agentSlug: resolvedAgentSlug ?? 'orchestrator',
              seq: ++stepSeq,
              toolSlug: tool.name,
              input: block.input as Json,
            })
            if (stepId) toolStepIds.set(tool.name, stepId)
          }
        }

        const stepStartedAt = Date.now()

        // Reflection Loop: bei Fehlern bekommt Claude die Fehlermeldung als
        // tool_result zurück und darf bis zu MAX_TOOL_RETRIES alternative
        // Versuche starten. Danach eskaliert JARVIS statt endlos zu wiederholen.
        try {
          const result = await tool.execute(block.input as Record<string, unknown>, { runId: runId ?? undefined })
          toolFailureCounts.delete(tool.name)
          toolStepIds.delete(tool.name)
          if (stepId) {
            await finishToolCallStep({
              stepId,
              status: 'done',
              output: (typeof result === 'string' ? { text: result } : (result as Json)) ?? null,
              durationMs: Date.now() - stepStartedAt,
              retryCount: attemptRetryCount,
            })
          }
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: typeof result === 'string' ? result : JSON.stringify(result),
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unbekannter Fehler'

          let content: string
          if (error instanceof IntegrationError && (error.code === 'missing_key' || error.code === 'unauthorized')) {
            // Ein fehlender/ungültiger Schlüssel behebt sich nicht durch einen erneuten Versuch —
            // sofort eskalieren statt die 3 Retries zu verbrauchen.
            content = `Tool "${tool.name}" ist nicht verfügbar (${message}). Sag Eric ehrlich, dass der Dienst nicht konfiguriert ist, und versuch es nicht erneut.`
          } else {
            const failures = (toolFailureCounts.get(tool.name) ?? 0) + 1
            toolFailureCounts.set(tool.name, failures)

            content =
              failures >= MAX_TOOL_RETRIES
                ? `Tool "${tool.name}" ist nach ${MAX_TOOL_RETRIES} Versuchen weiterhin fehlgeschlagen: ${message}. Brich diesen Ansatz ab und informiere Eric, dass er das manuell prüfen muss.`
                : `Fehler beim Ausführen von "${tool.name}": ${message}. Versuche einen alternativen Ansatz.`
          }

          if (stepId) {
            await finishToolCallStep({
              stepId,
              status: 'error',
              output: { error: message } as Json,
              durationMs: Date.now() - stepStartedAt,
              retryCount: toolFailureCounts.get(tool.name) ?? attemptRetryCount,
            })
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content,
            is_error: true,
          })
        }
      }

      conversation.push({ role: 'user', content: toolResults })
    }
  } catch (error) {
    if (runId) {
      await finalizeAgentRun({
        runId,
        status: 'failed',
        significance: computeSignificance({ calledAnyTool, calledSubAgentTool, hadConfirmation, failed: true }),
        error: { message: error instanceof Error ? error.message : 'Unbekannter Fehler' } as Json,
      })
    }
    throw error
  }

  // MAX_ITERATIONS erreicht, ohne dass die Schleife regulär (stop_reason !== 'tool_use') zurückgekehrt ist.
  const fallbackText =
    finalText ||
    'Ich konnte die Anfrage nicht innerhalb der maximalen Anzahl an Schritten abschließen. Bitte prüfe das manuell.'

  if (runId) {
    await finalizeAgentRun({
      runId,
      status: 'failed',
      significance: computeSignificance({ calledAnyTool, calledSubAgentTool, hadConfirmation, failed: true }),
      result: { text: fallbackText } as Json,
    })
  }

  return { type: 'final', text: fallbackText }
}
