import Anthropic from '@anthropic-ai/sdk'
import { buildJarvisSystemPrompt } from './system-prompt'
import { getColdStartContext, getPromptContext } from './context'
import { JARVIS_COLD_START_TRIGGER } from './constants'
import { toolRegistry as defaultToolRegistry } from './tools'
import { IntegrationError } from '@/lib/integrations/errors'
import type { ToolRegistry } from './tool-types'

export type { JarvisTool, ToolRegistry } from './tool-types'
export { toolRegistry } from './tools'

const MAX_ITERATIONS = 10
const MAX_TOOL_RETRIES = 3

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
  onTextDelta?: (text: string) => void
}

export type JarvisAgentResult =
  | { type: 'final'; text: string }
  | {
      type: 'confirmation_required'
      toolName: string
      toolArgs: Record<string, unknown>
      toolUseId: string
      conversation: Anthropic.MessageParam[]
    }

export async function runJarvisAgent({
  messages,
  tools = defaultToolRegistry,
  systemPrompt: systemPromptOverride,
  onTextDelta,
}: RunJarvisAgentOptions): Promise<JarvisAgentResult> {
  const client = getClient()
  const conversation: Anthropic.MessageParam[] = [...messages]
  const toolFailureCounts = new Map<string, number>()

  let systemPrompt = systemPromptOverride
  if (!systemPrompt) {
    const lastMessage = messages[messages.length - 1]
    const isColdStart = isColdStartTrigger(lastMessage)
    const coldStartContext = isColdStart ? await getColdStartContext() : null

    const lastUserText = !isColdStart ? getLastUserText(lastMessage) : null
    const knowledgeContext = lastUserText ? await getPromptContext(lastUserText) : null

    systemPrompt = buildJarvisSystemPrompt(coldStartContext, knowledgeContext)
  }

  let finalText = ''

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
        return {
          type: 'confirmation_required',
          toolName: tool.name,
          toolArgs: block.input as Record<string, unknown>,
          toolUseId: block.id,
          conversation,
        }
      }

      // Reflection Loop: bei Fehlern bekommt Claude die Fehlermeldung als
      // tool_result zurück und darf bis zu MAX_TOOL_RETRIES alternative
      // Versuche starten. Danach eskaliert JARVIS statt endlos zu wiederholen.
      try {
        const result = await tool.execute(block.input as Record<string, unknown>)
        toolFailureCounts.delete(tool.name)
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

  return {
    type: 'final',
    text:
      finalText ||
      'Ich konnte die Anfrage nicht innerhalb der maximalen Anzahl an Schritten abschließen. Bitte prüfe das manuell.',
  }
}
