import type Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { runJarvisAgent } from './agent'
import { appendMessage } from './persistence'
import type { PageContext } from './system-prompt'
import type { Json } from '@/types/database'

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
} as const

export interface JarvisStreamOptions {
  profileId: string
  /** Nur bei einer echten neuen Nutzer-Nachricht gesetzt (nicht beim Cold-Start-
   * Trigger und nicht beim Fortsetzen nach einer Bestätigung — die Nutzer-Nachricht
   * wurde dort bereits beim ursprünglichen /chat-Call persistiert). */
  userMessage?: string
  pageContext?: PageContext | null
  /** Fortsetzung eines pausierten Laufs nach /api/jarvis/confirm — an
   * runJarvisAgent()s existingRunId durchgereicht, statt einen neuen
   * agent_runs-Eintrag anzulegen. */
  existingRunId?: string
}

/**
 * Führt den Agent-Loop aus und streamt das Ergebnis per SSE. Wird von
 * /api/jarvis/chat (neue Nachricht) und /api/jarvis/confirm (Fortsetzung nach
 * Bestätigung) gleichermaßen genutzt. Persistiert nebenbei die sichtbaren
 * Text-Turns (lib/jarvis/persistence.ts), damit die Konversation Reloads übersteht.
 */
export function createJarvisStream(
  conversation: Anthropic.MessageParam[],
  { profileId, userMessage, pageContext, existingRunId }: JarvisStreamOptions
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        if (userMessage) {
          await appendMessage(profileId, 'user', userMessage)
        }

        const result = await runJarvisAgent({
          messages: conversation,
          pageContext,
          existingRunId,
          onTextDelta: (text) => send('delta', { text }),
        })

        if (result.type === 'confirmation_required') {
          const adminClient = createAdminClient()
          const { data: pending, error } = await adminClient
            .from('pending_actions')
            .insert({
              tool_name: result.toolName,
              tool_args: result.toolArgs as Json,
              conversation: result.conversation as unknown as Json,
              run_id: result.runId,
              step_id: result.stepId,
            })
            .select('id')
            .single()

          if (error || !pending) {
            send('error', { message: 'Bestätigung konnte nicht gespeichert werden.' })
          } else {
            send('confirmation_required', {
              id: pending.id,
              toolName: result.toolName,
              args: result.toolArgs,
            })
          }
        } else {
          if (result.text) {
            await appendMessage(profileId, 'assistant', result.text)
          }
          send('done', {})
        }
      } catch (error) {
        send('error', { message: error instanceof Error ? error.message : 'Unbekannter Fehler' })
      } finally {
        controller.close()
      }
    },
  })
}
