import type Anthropic from '@anthropic-ai/sdk'

// ── Tool-Registry-Interface ────────────────────────────────────────────────
// Jedes JARVIS-Tool implementiert dieses Interface und wird über
// lib/jarvis/tools/index.ts in der Registry zusammengeführt.

export interface ToolExecuteContext {
  /** run_id des aktuellen agent_runs-Eintrags (lib/jarvis/agent.ts) — wird an
   * buildSubAgentTool() (lib/jarvis/tools/subagents.ts) durchgereicht, damit
   * Sub-Agenten-Aufrufe dort als parent_run_id verlinkt werden. Optional, damit die
   * bestehenden ~75 Tool-Implementierungen (die den Context ignorieren) unverändert
   * gültig bleiben — TS erlaubt eine execute-Funktion mit weniger Parametern als das
   * Interface deklariert. */
  runId?: string
}

export interface JarvisTool {
  name: string
  definition: Anthropic.Tool
  requiresConfirmation: boolean
  execute: (args: Record<string, unknown>, context?: ToolExecuteContext) => Promise<unknown>
}

export type ToolRegistry = Map<string, JarvisTool>
