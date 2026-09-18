import { createAdminClient } from '@/lib/supabase/admin'
import { runHelmAgent } from './core/run'
import { toAiSdkTools, CATALOG, CONFIRMATION_REQUIRED_SLUGS } from './catalog/registry'
import { buildAiSdkTools } from './catalog/build'
import { buildScopedRegistry } from './delegate'
import { SUBAGENTS } from './subagents'
import type { HelmAutomation } from '@/types/database'

/** Feste UTC-Verschiebung für Europe/Berlin (CET) — Sommerzeit (CEST, +2) wird in v1 bewusst
 * NICHT behandelt (siehe Migration 0044): an DST-Tagen kann next_run_at bis zu 1h daneben
 * liegen. Für "jeden Montag 8 Uhr"-Automationen akzeptabel, im Formular kommuniziert. */
const BERLIN_UTC_OFFSET_HOURS = 1

export type AutomationSchedule = Pick<HelmAutomation, 'recurrence' | 'weekday' | 'time_of_day'>

/** Berechnet den nächsten fälligen Zeitpunkt (UTC) ab `from` für eine Automation. */
export function computeNextRunAt(schedule: AutomationSchedule, from: Date = new Date()): Date {
  const [hh, mm] = schedule.time_of_day.split(':').map((n) => Number(n))

  // "Berlin-naive" Wanduhrzeit: from (echtes UTC) + fester Offset, dann in UTC-Feldern rechnen.
  const berlinNow = new Date(from.getTime() + BERLIN_UTC_OFFSET_HOURS * 3_600_000)
  const candidate = new Date(
    Date.UTC(berlinNow.getUTCFullYear(), berlinNow.getUTCMonth(), berlinNow.getUTCDate(), hh, mm, 0, 0)
  )

  if (schedule.recurrence === 'daily') {
    if (candidate.getTime() <= berlinNow.getTime()) candidate.setUTCDate(candidate.getUTCDate() + 1)
  } else {
    const targetWeekday = schedule.weekday ?? 0
    let diffDays = (targetWeekday - candidate.getUTCDay() + 7) % 7
    if (diffDays === 0 && candidate.getTime() <= berlinNow.getTime()) diffDays = 7
    candidate.setUTCDate(candidate.getUTCDate() + diffDays)
  }

  return new Date(candidate.getTime() - BERLIN_UTC_OFFSET_HOURS * 3_600_000)
}

/**
 * Führt eine Automation genau einmal aus (Orchestrator oder Sub-Agent, je nach agent_slug)
 * und schreibt danach IMMER (Erfolg wie Fehler) last_run_at/next_run_at fort — genutzt sowohl
 * vom Cron-Dispatcher (app/api/cron/helm-automations/route.ts) als auch vom manuellen
 * "Jetzt ausführen"-Button (lib/helm/actions/automations.ts#runAutomationNow), damit die
 * Orchestrator-vs-Sub-Agent-Verzweigung nur an einer Stelle existiert.
 */
export async function executeAutomation(automation: HelmAutomation): Promise<void> {
  try {
    if (automation.agent_slug === 'orchestrator') {
      const result = await runHelmAgent({
        messages: [{ role: 'user', content: automation.task }],
        buildTools: (ctx) => toAiSdkTools(ctx),
        toolCatalog: {
          text: CATALOG.map((def) => `- ${def.slug}: ${def.description}`).join('\n'),
          confirmationSlugs: CONFIRMATION_REQUIRED_SLUGS,
        },
        agentSlug: 'orchestrator',
        trigger: 'automation',
        automationId: automation.id,
      })
      await result.text
    } else {
      const def = SUBAGENTS.find((s) => s.name === automation.agent_slug)
      if (!def) throw new Error(`Automation "${automation.label}": unbekannter Agent-Slug "${automation.agent_slug}".`)

      const { defs, systemPrompt, model } = await buildScopedRegistry(def)
      const result = await runHelmAgent({
        messages: [{ role: 'user', content: automation.task }],
        buildTools: (ctx) => buildAiSdkTools(defs, ctx),
        systemPrompt,
        model,
        agentSlug: automation.agent_slug,
        trigger: 'automation',
        automationId: automation.id,
      })
      await result.text
    }
  } catch (error) {
    console.error(`[helm/automations] "${automation.label}" fehlgeschlagen:`, error instanceof Error ? error.message : error)
  } finally {
    const adminClient = createAdminClient()
    await adminClient
      .from('helm_automations')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: computeNextRunAt(automation).toISOString(),
      })
      .eq('id', automation.id)
  }
}
