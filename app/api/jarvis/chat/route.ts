import { assertAdmin } from '@/lib/auth/assert-admin'
import { createJarvisStream, SSE_HEADERS } from '@/lib/jarvis/stream'
import { JARVIS_COLD_START_TRIGGER } from '@/lib/jarvis/constants'
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
  const supabase = await assertAdmin()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Nicht angemeldet.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await request.json().catch(() => null)
  const messages = body?.messages
  const currentPath = typeof body?.currentPath === 'string' ? body.currentPath : null
  const pageHeading = typeof body?.pageHeading === 'string' ? body.pageHeading : null
  // Clientseitig bereits gekappt (JarvisWidget.tsx) — hier nochmal serverseitig
  // deckeln, falls die Payload manipuliert wird.
  const pageText = typeof body?.pageText === 'string' ? body.pageText.slice(0, 8000) : null
  const focusedFieldRaw = body?.focusedField
  const focusedField =
    focusedFieldRaw &&
    typeof focusedFieldRaw === 'object' &&
    typeof focusedFieldRaw.label === 'string' &&
    typeof focusedFieldRaw.value === 'string'
      ? { label: focusedFieldRaw.label.slice(0, 200), value: focusedFieldRaw.value.slice(0, 4000) }
      : null

  if (!isValidMessages(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages fehlt oder ist ungültig.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const lastMessage = messages[messages.length - 1]
  const lastText = lastMessage.role === 'user' && typeof lastMessage.content === 'string' ? lastMessage.content : null
  const isColdStart = lastText === JARVIS_COLD_START_TRIGGER

  return new Response(
    createJarvisStream(messages, {
      profileId: user.id,
      userMessage: !isColdStart && lastText ? lastText : undefined,
      pageContext: currentPath ? { path: currentPath, heading: pageHeading, pageText, focusedField } : null,
    }),
    { headers: SSE_HEADERS }
  )
}
