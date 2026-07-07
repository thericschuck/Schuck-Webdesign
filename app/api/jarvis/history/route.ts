import { assertAdmin } from '@/lib/auth/assert-admin'
import { clearConversation, loadConversation } from '@/lib/jarvis/persistence'

export const runtime = 'nodejs'

async function getCurrentUserId() {
  const supabase = await assertAdmin()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Nicht angemeldet.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const messages = await loadConversation(userId)
  return new Response(JSON.stringify({ messages }), { headers: { 'Content-Type': 'application/json' } })
}

export async function DELETE() {
  const userId = await getCurrentUserId()
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Nicht angemeldet.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  await clearConversation(userId)
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
}
