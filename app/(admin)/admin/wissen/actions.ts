'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/assert-admin'
import * as knowledgeDomain from '@/lib/domain/knowledge'
import type { EdgeType, NodeConfidence, NodeType } from '@/types/database'

type ActionResult = { status: 'error'; message: string } | { status: 'success' }

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

// ── Neuer Knoten ─────────────────────────────────────────────────────────

type CreateNodeResult = { status: 'error'; message: string } | { status: 'success'; nodeId: string }

export async function createNodeAction(_prev: CreateNodeResult | null, formData: FormData): Promise<CreateNodeResult> {
  await assertAdmin()

  const type = str(formData, 'type') as NodeType | null
  const label = str(formData, 'label')
  if (!type) return { status: 'error', message: 'Typ ist erforderlich.' }
  if (!label) return { status: 'error', message: 'Label ist erforderlich.' }

  try {
    const node = await knowledgeDomain.addNode({
      type,
      label,
      body: str(formData, 'body'),
      source: 'user_explicit',
    })
    revalidatePath('/admin/wissen')
    return { status: 'success', nodeId: node.id }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Knoten konnte nicht angelegt werden.' }
  }
}

// ── Knoten bearbeiten ────────────────────────────────────────────────────

export async function updateNodeAction(
  nodeId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await assertAdmin()

  try {
    await knowledgeDomain.updateNode(nodeId, {
      label: str(formData, 'label') ?? undefined,
      body: str(formData, 'body'),
      confidence: (str(formData, 'confidence') as NodeConfidence | null) ?? undefined,
    })
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Fehler beim Speichern.' }
  }

  revalidatePath(`/admin/wissen/${nodeId}`)
  revalidatePath('/admin/wissen')
  return { status: 'success' }
}

// ── Deprecaten ───────────────────────────────────────────────────────────

export async function deprecateNodeAction(nodeId: string): Promise<ActionResult> {
  await assertAdmin()

  try {
    await knowledgeDomain.deprecateNode(nodeId)
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Knoten konnte nicht deprecated werden.' }
  }

  revalidatePath(`/admin/wissen/${nodeId}`)
  revalidatePath('/admin/wissen')
  return { status: 'success' }
}

// ── Kante anlegen ────────────────────────────────────────────────────────

export interface NodeSearchResult {
  id: string
  label: string
  type: NodeType
}

export async function searchNodesAction(query: string): Promise<NodeSearchResult[]> {
  await assertAdmin()
  if (!query.trim()) return []

  try {
    const nodes = await knowledgeDomain.listNodes({ search: query })
    return nodes.slice(0, 15).map((n) => ({ id: n.id, label: n.label, type: n.type }))
  } catch {
    return []
  }
}

type LinkNodeResult = { status: 'error'; message: string } | { status: 'success' }

export async function linkNodeAction(fromId: string, toId: string, type: EdgeType): Promise<LinkNodeResult> {
  await assertAdmin()

  try {
    await knowledgeDomain.linkNodes(fromId, toId, type)
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Kante konnte nicht angelegt werden.' }
  }

  revalidatePath(`/admin/wissen/${fromId}`)
  return { status: 'success' }
}
