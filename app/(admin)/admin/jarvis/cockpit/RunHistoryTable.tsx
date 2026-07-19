'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SignificanceBadge } from './SignificanceBadge'
import { formatDateTime, formatDuration, STATUS_COLOR, STATUS_LABEL, type RunHistoryRow } from './types'
import { useAgentRunsRealtime, type AgentRunChangeRow } from './useAgentRunsRealtime'

const RUN_HISTORY_LIMIT = 30

function toRow(
  run: {
    id: string
    agent_id: string | null
    task: string | null
    status: RunHistoryRow['status']
    started_at: string | null
    ended_at: string | null
    significance: RunHistoryRow['significance']
  },
  agentNameById: Map<string, string>
): RunHistoryRow {
  return {
    id: run.id,
    agentLabel: (run.agent_id && agentNameById.get(run.agent_id)) ?? 'Unbekannt',
    task: run.task,
    status: run.status,
    startedAt: run.started_at,
    endedAt: run.ended_at,
    significance: run.significance,
  }
}

export function RunHistoryTable() {
  const [rows, setRows] = useState<RunHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Agentenliste ändert sich zur Laufzeit praktisch nie (Anlegen/Umbenennen passiert nicht
  // im laufenden Betrieb) — ein einmaliger Fetch beim Mount reicht, dafür braucht es keine
  // eigene Realtime-Subscription auf public.agents.
  const agentNameByIdRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const [{ data: agents }, { data: runs, error: runsError }] = await Promise.all([
        supabase.from('agents').select('id, name'),
        supabase
          .from('agent_runs')
          .select('id, agent_id, task, status, started_at, ended_at, significance')
          .order('started_at', { ascending: false })
          .limit(RUN_HISTORY_LIMIT),
      ])
      if (cancelled) return

      agentNameByIdRef.current = new Map((agents ?? []).map((a) => [a.id, a.name]))

      if (runsError) {
        setError(runsError.message)
        setLoading(false)
        return
      }
      setRows((runs ?? []).map((r) => toRow(r, agentNameByIdRef.current)))
      setLoading(false)
    }
    load().catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Unbekannter Fehler.')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleAgentRunChange = useCallback((row: AgentRunChangeRow, eventType: 'INSERT' | 'UPDATE') => {
    const nextRow = toRow(row, agentNameByIdRef.current)

    setRows((prev) => {
      if (eventType === 'INSERT') {
        return [nextRow, ...prev.filter((r) => r.id !== row.id)].slice(0, RUN_HISTORY_LIMIT)
      }
      // UPDATE: nur patchen, wenn der Run gerade sichtbar ist — ein Run, der schon aus dem
      // 30er-Fenster gefallen ist, soll dadurch nicht wieder nach oben "nachrutschen".
      const idx = prev.findIndex((r) => r.id === row.id)
      if (idx === -1) return prev
      const copy = [...prev]
      copy[idx] = nextRow
      return copy
    })
  }, [])

  const { connectionStatus } = useAgentRunsRealtime(handleAgentRunChange)

  if (loading) {
    return (
      <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        Lädt…
      </p>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        Run-Historie konnte nicht geladen werden: {error}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {connectionStatus === 'lost' && (
        <div className="flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs text-amber-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Verbindung verloren — verbinde erneut…
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Noch keine Runs protokolliert.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                <th className="pb-2 pr-4 font-medium">Agent</th>
                <th className="pb-2 pr-4 font-medium">Aufgabe</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Gestartet</th>
                <th className="pb-2 pr-4 font-medium">Dauer</th>
                <th className="pb-2 font-medium">Relevanz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id} className={row.significance === 'trivial' ? 'opacity-60' : undefined}>
                  <td className="py-2.5 pr-4 text-gray-800 whitespace-nowrap" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {row.agentLabel}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-600 max-w-md truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {row.task ?? '—'}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLOR[row.status]}`}>
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {formatDateTime(row.startedAt)}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {formatDuration(row.startedAt, row.endedAt, row.status)}
                  </td>
                  <td className="py-2.5">
                    <SignificanceBadge significance={row.significance} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
