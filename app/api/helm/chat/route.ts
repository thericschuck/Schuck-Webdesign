import { convertToModelMessages, type UIMessage } from 'ai'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { runHelmAgent } from '@/lib/helm/core/run'
import { toAiSdkTools, CATALOG, CONFIRMATION_REQUIRED_SLUGS } from '@/lib/helm/catalog/registry'
import { HELM_COLD_START_TRIGGER } from '@/lib/helm/core/constants'
import { appendHelmMessage } from '@/lib/helm/persistence'
import type { PageContext } from '@/lib/helm/core/system-prompt'

export const runtime = 'nodejs'

function isUIMessageArray(value: unknown): value is UIMessage[] {
  return Array.isArray(value) && value.every((entry) => entry && typeof entry === 'object' && 'role' in entry)
}

function extractText(message: UIMessage | undefined): string | null {
  if (!message || !Array.isArray(message.parts)) return null
  const text = message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('')
  return text || null
}

function parsePageContext(body: Record<string, unknown>): PageContext | null {
  const currentPath = typeof body.currentPath === 'string' ? body.currentPath : null
  if (!currentPath) return null

  const pageHeading = typeof body.pageHeading === 'string' ? body.pageHeading : null
  // Clientseitig bereits gekappt (HelmWidget.tsx) — hier nochmal serverseitig deckeln,
  // falls die Payload manipuliert wird.
  const pageText = typeof body.pageText === 'string' ? body.pageText.slice(0, 8000) : null
  const focusedFieldRaw = body.focusedField as { label?: unknown; value?: unknown } | undefined
  const focusedField =
    focusedFieldRaw && typeof focusedFieldRaw.label === 'string' && typeof focusedFieldRaw.value === 'string'
      ? { label: focusedFieldRaw.label.slice(0, 200), value: focusedFieldRaw.value.slice(0, 4000) }
      : null

  return { path: currentPath, heading: pageHeading, pageText, focusedField }
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

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const messages = body?.messages

  if (!isUIMessageArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages fehlt oder ist ungültig.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const pageContext = parsePageContext(body ?? {})
  const lastMessage = messages[messages.length - 1]
  const lastText = lastMessage?.role === 'user' ? extractText(lastMessage) : null
  const isColdStart = lastText === HELM_COLD_START_TRIGGER

  if (lastMessage?.role === 'user' && !isColdStart) {
    await appendHelmMessage(user.id, lastMessage)
  }

  const modelMessages = await convertToModelMessages(messages)

  const result = await runHelmAgent({
    messages: modelMessages,
    buildTools: (context) => toAiSdkTools(context),
    toolCatalog: {
      text: CATALOG.map((def) => `- ${def.slug}: ${def.description}`).join('\n'),
      confirmationSlugs: CONFIRMATION_REQUIRED_SLUGS,
    },
    pageContext,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onEnd: async ({ messages: finalMessages }) => {
      const last = finalMessages[finalMessages.length - 1]
      if (last?.role === 'assistant') {
        await appendHelmMessage(user.id, last)
      }
    },
  })
}
