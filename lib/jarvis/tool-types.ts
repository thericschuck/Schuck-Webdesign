import type Anthropic from '@anthropic-ai/sdk'

// ── Tool-Registry-Interface ────────────────────────────────────────────────
// Jedes JARVIS-Tool implementiert dieses Interface und wird über
// lib/jarvis/tools/index.ts in der Registry zusammengeführt.

export interface JarvisTool {
  name: string
  definition: Anthropic.Tool
  requiresConfirmation: boolean
  execute: (args: Record<string, unknown>) => Promise<unknown>
}

export type ToolRegistry = Map<string, JarvisTool>
