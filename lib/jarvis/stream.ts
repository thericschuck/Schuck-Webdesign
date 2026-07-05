import type Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { runJarvisAgent } from './agent'
import type { Json } from '@/types/database'

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
} as const

/**
 * Führt den Agent-Loop aus und streamt das Ergebnis per SSE. Wird von
 * /api/jarvis/chat (neue Nachricht) und /api/jarvis/confirm (Fortsetzung nach
 * Bestätigung) gleichermaßen genutzt.
 */
export function createJarvisStream(conversation: Anthropic.MessageParam[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const result = await runJarvisAgent({
          messages: conversation,
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
