import { assertAdmin } from '@/lib/auth/assert-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { createJarvisStream, SSE_HEADERS } from '@/lib/jarvis/stream'
import { toolRegistry } from '@/lib/jarvis/agent'
import type Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function findLastToolUseBlock(
  conversation: Anthropic.MessageParam[]
): Anthropic.ToolUseBlock | null {
  for (let i = conversation.length - 1; i >= 0; i--) {
    const message = conversation[i]
    if (message.role !== 'assistant' || !Array.isArray(message.content)) continue

    const toolUseBlock = message.content.find(
      (block): block is Anthropic.ToolUseBlock =>
        typeof block === 'object' && block !== null && 'type' in block && block.type === 'tool_use'
    )
    if (toolUseBlock) return toolUseBlock
  }
  return null
}

export async function POST(request: Request) {
  const supabase = await assertAdmin()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return jsonError('Nicht angemeldet.', 401)

  const body = await request.json().catch(() => null)
  const id = body?.id
  const decision = body?.decision

  if (typeof id !== 'string' || (decision !== 'approve' && decision !== 'reject')) {
    return jsonError('id oder decision fehlt/ungültig.', 400)
  }

  const adminClient = createAdminClient()

  const { data: pending } = await adminClient
    .from('pending_actions')
    .select('*')
    .eq('id', id)
    .single()

  if (!pending) {
    return jsonError('Bestätigung nicht gefunden oder bereits verarbeitet.', 404)
  }

  // Abgelaufene pending_actions beim Zugriff löschen statt sie auszuführen.
  if (new Date(pending.expires_at).getTime() < Date.now()) {
    await adminClient.from('pending_actions').delete().eq('id', id)
    return jsonError('Diese Bestätigung ist abgelaufen.', 410)
  }

  await adminClient.from('pending_actions').delete().eq('id', id)

  const conversation = pending.conversation as unknown as Anthropic.MessageParam[]
  const toolArgs = pending.tool_args as Record<string, unknown>
  const toolName = pending.tool_name

  const toolUseBlock = findLastToolUseBlock(conversation)
  if (!toolUseBlock) {
    return jsonError('Ursprünglicher Tool-Aufruf konnte nicht rekonstruiert werden.', 500)
  }

  let toolResultContent: string
  let isError = false

  if (decision === 'reject') {
    toolResultContent = 'Vom Nutzer abgelehnt.'
  } else {
    const tool = toolRegistry.get(toolName)
    if (!tool) {
      toolResultContent = `Tool "${toolName}" ist nicht mehr registriert.`
      isError = true
    } else {
      try {
        const result = await tool.execute(toolArgs)
        toolResultContent = typeof result === 'string' ? result : JSON.stringify(result)
      } catch (error) {
        toolResultContent = `Fehler beim Ausführen von "${toolName}": ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
        isError = true
      }
    }
  }

  const resumedConversation: Anthropic.MessageParam[] = [
    ...conversation,
    {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUseBlock.id,
          content: toolResultContent,
          ...(isError ? { is_error: true } : {}),
        },
      ],
    },
  ]

  return new Response(createJarvisStream(resumedConversation, { profileId: user.id }), { headers: SSE_HEADERS })
}
