import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { CATALOG } from '@/lib/helm/catalog/registry'

/**
 * Tool-Metadaten für die Cockpit-UI (Client-Komponente, kann lib/helm/catalog/registry.ts
 * nicht direkt importieren) — Single Source of Truth ist jetzt der Code-Katalog, nicht mehr
 * eine separate Kopie in public.tools (das per Migration 0041 auf id/slug abgespeckt wird;
 * agent_tools referenziert weiterhin tools.id — nur die jetzt redundanten Beschreibungs-
 * spalten fallen weg).
 */
export async function GET() {
  await assertAdmin()

  const tools = CATALOG.map((def) => ({
    id: def.slug,
    slug: def.slug,
    name: def.label,
    description: def.description,
    isIrreversible: def.requiresConfirmation,
  }))

  return NextResponse.json({ tools })
}
