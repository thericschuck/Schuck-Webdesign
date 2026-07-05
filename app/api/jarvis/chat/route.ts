import { assertAdmin } from '@/lib/auth/assert-admin'
import { createJarvisStream, SSE_HEADERS } from '@/lib/jarvis/stream'
import type Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

function isValidMessages(value: unknown): value is Anthropic.MessageParam[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        (entry.role === 'user' || entry.role === 'assistant') &&
        typeof entry.content === 'string'
    )
  )
}

export async function POST(request: Request) {
  await assertAdmin()

  const body = await request.json().catch(() => null)
  const messages = body?.messages

  if (!isValidMessages(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages fehlt oder ist ungültig.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(createJarvisStream(messages), { headers: SSE_HEADERS })
}
