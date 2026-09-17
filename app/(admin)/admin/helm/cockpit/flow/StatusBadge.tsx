'use client'

import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'

export type RunVisualStatus = 'idle' | 'running' | 'error' | 'done'

const CONFIG: Record<RunVisualStatus, { icon: typeof Circle; className: string; label: string }> = {
  idle: { icon: Circle, className: 'text-white/20', label: 'idle' },
  running: { icon: Loader2, className: 'text-blue-400 animate-spin', label: 'running' },
  done: { icon: CheckCircle2, className: 'text-emerald-400', label: 'done' },
  error: { icon: XCircle, className: 'text-red-400', label: 'error' },
}

/** idle/running/error/done — eigene Achse (Laufstatus), unabhängig von SignificanceBadge
 * (das ist Relevanz eines abgeschlossenen Runs). Läuft rein aus React-State, das
 * useAgentRunsRealtime.ts-Events in CockpitExplorer.tsx pflegen — kein Canvas/Ref mehr. */
export function StatusBadge({ status }: { status: RunVisualStatus }) {
  const { icon: Icon, className, label } = CONFIG[status]
  return (
    <span className={`inline-flex items-center justify-center w-4 h-4 shrink-0 ${className}`} title={label}>
      <Icon className="w-3.5 h-3.5" />
    </span>
  )
}
