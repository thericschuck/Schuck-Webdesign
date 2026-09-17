import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { CATALOG_BY_SLUG } from '@/lib/helm/catalog/registry'
import { loadAgentDetail } from '../../shared'

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/** Ersetzt die komplette agent_tools-Zuordnung eines Agenten (erst löschen, dann neu
 * einfügen — wie im Auftrag beschrieben, kein separates Diffing einzelner Zeilen). */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await assertAdmin()
  const { id } = await params

  const body = await request.json().catch(() => null)
  const toolIds = body?.toolIds

  if (!Array.isArray(toolIds) || !toolIds.every((v) => typeof v === 'string')) {
    return jsonError('toolIds muss ein Array von Tool-IDs sein.', 400)
  }

  const admin = createAdminClient()

  if (toolIds.length > 0) {
    const { data: tools, error: toolsError } = await admin.from('tools').select('id, slug').in('id', toolIds)
    if (toolsError) return jsonError(toolsError.message, 500)

    const foundIds = new Set((tools ?? []).map((t) => t.id))
    const missing = toolIds.filter((toolId) => !foundIds.has(toolId))
    if (missing.length > 0) {
      return jsonError(`Unbekannte Tool-ID(s): ${missing.join(', ')}`, 400)
    }

    // Dieselbe Regel wie in buildScopedRegistry (lib/helm/delegate.ts) — hier zusätzlich an
    // der Eingabe-Kante durchsetzen, nicht erst beim nächsten Chat-Lauf merken. Bestätigungs-
    // pflicht kommt aus dem Code-Katalog (public.tools kennt is_irreversible seit Migration
    // 0041 nicht mehr).
    const irreversible = (tools ?? []).filter((t) => CATALOG_BY_SLUG.get(t.slug)?.requiresConfirmation)
    if (irreversible.length > 0) {
      return jsonError(
        `Bestätigungspflichtige Tools können keinem Sub-Agenten zugeordnet werden: ${irreversible.map((t) => t.slug).join(', ')}`,
        400
      )
    }
  }

  const { error: deleteError } = await admin.from('agent_tools').delete().eq('agent_id', id)
  if (deleteError) return jsonError(deleteError.message, 500)

  if (toolIds.length > 0) {
    const { error: insertError } = await admin
      .from('agent_tools')
      .insert(toolIds.map((toolId: string) => ({ agent_id: id, tool_id: toolId })))
    if (insertError) return jsonError(insertError.message, 500)
  }

  const detail = await loadAgentDetail(admin, id)
  if (!detail) return jsonError('Agent nicht gefunden.', 404)
  return NextResponse.json(detail)
}
