import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALLOWED_AGENT_MODELS } from '@/app/(admin)/admin/jarvis/cockpit/types'
import { loadAgentDetail } from '../shared'
import type { Database } from '@/types/database'

type AgentUpdate = Database['public']['Tables']['agents']['Update']

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await assertAdmin()
  const { id } = await params
  const admin = createAdminClient()

  const detail = await loadAgentDetail(admin, id)
  if (!detail) return jsonError('Agent nicht gefunden.', 404)
  return NextResponse.json(detail)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await assertAdmin()
  const { id } = await params

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return jsonError('Ungültiger Request-Body.', 400)

  const update: AgentUpdate = {}

  if ('systemPrompt' in body) {
    if (typeof body.systemPrompt !== 'string' || !body.systemPrompt.trim()) {
      return jsonError('systemPrompt darf nicht leer sein.', 400)
    }
    update.system_prompt = body.systemPrompt
  }

  if ('model' in body) {
    if (typeof body.model !== 'string' || !ALLOWED_AGENT_MODELS.includes(body.model as (typeof ALLOWED_AGENT_MODELS)[number])) {
      return jsonError(`model muss einer von: ${ALLOWED_AGENT_MODELS.join(', ')} sein.`, 400)
    }
    update.model = body.model
  }

  if ('status' in body) {
    if (body.status !== 'active' && body.status !== 'inactive') {
      return jsonError("status muss 'active' oder 'inactive' sein.", 400)
    }
    update.status = body.status
  }

  if (Object.keys(update).length === 0) {
    return jsonError('Keine gültigen Felder zum Aktualisieren übergeben (systemPrompt, model, status).', 400)
  }

  update.updated_at = new Date().toISOString()

  const admin = createAdminClient()
  const { data: updatedRows, error } = await admin.from('agents').update(update).eq('id', id).select('id')
  if (error) return jsonError(error.message, 500)
  if (!updatedRows || updatedRows.length === 0) return jsonError('Agent nicht gefunden.', 404)

  const detail = await loadAgentDetail(admin, id)
  if (!detail) return jsonError('Agent nicht gefunden.', 404)
  return NextResponse.json(detail)
}
