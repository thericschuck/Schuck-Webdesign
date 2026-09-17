import { tool } from 'ai'
import { createAdminClient } from '@/lib/supabase/admin'
import type { HelmToolDef, ToolExecuteContext } from '../catalog/types'
import type { Json } from '@/types/database'

// ── Entkoppelte Bestätigung (ersetzt JARVISs "ganze Konversation pausieren") ────
//
// Ein requiresConfirmation:true-Tool führt NIE direkt aus. buildProposalTool() macht
// daraus ein Tool, dessen execute() nur einen pending_actions-Eintrag anlegt und
// {status:'pending_confirmation', actionId, summary} zurückgibt — der Modell-Loop
// (lib/helm/core/run.ts) sieht das als normales Tool-Ergebnis und läuft normal weiter,
// es wird nichts pausiert. Die eigentliche Ausführung (HelmToolDef.execute) passiert
// erst später, in confirm.ts#confirmPendingAction, nachdem Eric zugestimmt hat.

const DEFAULT_EXPIRY_MS = 30 * 60 * 1000

function defaultSummary(def: HelmToolDef, args: unknown): string {
  return `${def.label}: ${JSON.stringify(args)}`
}

export function buildProposalTool(def: HelmToolDef, context?: ToolExecuteContext) {
  return tool({
    description: `${def.description}\n\nWICHTIG: Dieses Tool führt nichts sofort aus — es legt nur einen Bestätigungsvorschlag an. Der Nutzer muss ihn im UI bestätigen oder ablehnen, bevor die Aktion wirklich ausgeführt wird.`,
    inputSchema: def.schema,
    async execute(args) {
      const summary = def.summarize ? def.summarize(args) : defaultSummary(def, args)
      const adminClient = createAdminClient()
      const { data, error } = await adminClient
        .from('pending_actions')
        .insert({
          tool_name: def.slug,
          tool_args: args as Json,
          summary,
          expires_at: new Date(Date.now() + DEFAULT_EXPIRY_MS).toISOString(),
          run_id: context?.runId ?? null,
          status: 'pending',
        })
        .select('id')
        .single()

      if (error || !data) {
        return { status: 'error', message: `Vorschlag konnte nicht gespeichert werden: ${error?.message ?? 'unbekannter Fehler'}` }
      }

      return {
        status: 'pending_confirmation',
        actionId: data.id,
        summary,
        note: 'Wartet auf die Bestätigung des Nutzers. Noch wurde NICHTS geändert.',
      }
    },
  })
}
