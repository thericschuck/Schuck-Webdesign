import { convertToModelMessages, type UIMessage } from 'ai'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { runHelmAgent } from '@/lib/helm/core/run'
import { toAiSdkTools, CATALOG, CONFIRMATION_REQUIRED_SLUGS } from '@/lib/helm/catalog/registry'
import { buildAiSdkTools } from '@/lib/helm/catalog/build'
import { buildScopedRegistry } from '@/lib/helm/delegate'
import { SUBAGENTS } from '@/lib/helm/subagents'
import { MENTIONABLE_PERSONAS } from '@/lib/helm/personas'
import { HELM_COLD_START_TRIGGER } from '@/lib/helm/core/constants'
import { appendHelmMessage, createHelmConversation } from '@/lib/helm/persistence'
import { titleConversationInBackground } from '@/lib/helm/core/title'
import { getHelmSettings } from '@/lib/helm/actions/settings'
import type { PageContext } from '@/lib/helm/core/system-prompt'

export const runtime = 'nodejs'

// "@design_agent Bitte prüfen …" — der Composer (HelmChat.tsx#selectMention) fügt immer den
// echten Slug ein, nie das Label, daher genügt ein einfacher Slug-Match ohne Fuzzy-Suche.
const MENTION_PATTERN = /^@([\w-]+)\s+([\s\S]+)$/

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
  // Clientseitig bereits gekappt (HelmChat.tsx) — hier nochmal serverseitig deckeln, falls die
  // Payload manipuliert wird.
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

  // Verteidigungsnetz: die Sidebar/der Session-Picker legen Konversationen normalerweise
  // schon vorher an (siehe lib/helm/actions/conversations.ts#createConversation) — trifft die
  // ID hier trotzdem nicht in der DB (z.B. manipulierte Payload), einfach neu anlegen statt
  // mit einem Fehler abzubrechen.
  let conversationId = typeof body?.conversationId === 'string' ? body.conversationId : null
  const { data: existingConversation } = conversationId
    ? await supabase.from('helm_conversations').select('id').eq('id', conversationId).maybeSingle()
    : { data: null }
  const isNewConversation = !existingConversation
  if (isNewConversation) {
    conversationId = await createHelmConversation(user.id)
  }

  const pageContext = parsePageContext(body ?? {})
  const lastMessage = messages[messages.length - 1]
  const lastText = lastMessage?.role === 'user' ? extractText(lastMessage) : null
  const isColdStart = lastText === HELM_COLD_START_TRIGGER

  if (lastMessage?.role === 'user' && !isColdStart) {
    await appendHelmMessage(user.id, conversationId!, lastMessage)
  }

  // @-Mention (siehe HelmChat.tsx#selectMention/MentionMenu.tsx): eine Nachricht direkt an
  // einen Sub-Agenten statt an Jarvis — läuft mit vollem Gesprächskontext (modelMessages,
  // nicht nur der einen Nachricht), aber dessen eigener Persona/Systemprompt/Modell. Der
  // Sub-Agent bekommt dabei automatisch nur seine lesenden Tools (buildScopedRegistry),
  // Schreibaktionen bleiben Jarvis mit Bestätigung vorbehalten.
  const mentionMatch = !isColdStart ? lastText?.match(MENTION_PATTERN) : null
  const mentionedPersona = mentionMatch ? MENTIONABLE_PERSONAS.find((p) => p.slug === mentionMatch[1]) : null

  let modelMessages = await convertToModelMessages(messages)
  if (mentionedPersona && mentionMatch) {
    modelMessages = [...modelMessages.slice(0, -1), { role: 'user', content: mentionMatch[2] }]
  }

  const respondingAgentSlug = mentionedPersona?.slug ?? 'orchestrator'
  const result = mentionedPersona
    ? await (async () => {
        const def = SUBAGENTS.find((s) => s.name === mentionedPersona.slug)!
        const { defs, systemPrompt, model } = await buildScopedRegistry(def)
        return runHelmAgent({
          messages: modelMessages,
          buildTools: (ctx) => buildAiSdkTools(defs, ctx),
          systemPrompt,
          model,
          agentSlug: mentionedPersona.slug,
          trigger: 'mention',
        })
      })()
    : await (async () => {
        const settings = await getHelmSettings()
        return runHelmAgent({
          messages: modelMessages,
          buildTools: (context) => toAiSdkTools(context),
          toolCatalog: {
            text: CATALOG.map((def) => `- ${def.slug}: ${def.description}`).join('\n'),
            confirmationSlugs: CONFIRMATION_REQUIRED_SLUGS,
          },
          pageContext,
          model: settings.model,
          effort: settings.effort,
        })
      })()

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    messageMetadata: () => ({ agentSlug: respondingAgentSlug }),
    onEnd: async ({ messages: finalMessages }) => {
      const last = finalMessages[finalMessages.length - 1]
      if (last?.role === 'assistant') {
        await appendHelmMessage(user.id, conversationId!, last)
      }
      if (isNewConversation && !isColdStart && lastText) {
        titleConversationInBackground(conversationId!, lastText)
      }
    },
  })
}
