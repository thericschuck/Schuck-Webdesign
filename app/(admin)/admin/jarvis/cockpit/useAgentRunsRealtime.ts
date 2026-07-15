'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RunStatus, Significance } from './types'

/**
 * Erste Stelle im Projekt mit Supabase Realtime (`postgres_changes`) — bewusst NICHT das
 * sonst überall im Admin-Bereich genutzte Fetch + `router.refresh()`: Runs entstehen nicht
 * nur durch eine Aktion des gerade zuschauenden Admins, sondern auch durch andere
 * Browser-Tabs (JARVIS-Chat) oder künftig durch Cron-getriggerte Agenten-Läufe, die
 * niemand aktiv im Blick hat. Ein reiner Seitenaufruf-Fetch würde solche Läufe erst nach
 * einem manuellen Reload zeigen — für "live zuschauen, während JARVIS arbeitet" reicht
 * das nicht, deshalb hier die Ausnahme.
 *
 * Realtime filtert nur ZEILEN (`filter: 'spalte=eq.wert'`), keine Spalten — "gefiltert auf
 * relevante Spalten" passiert deshalb im Handler selbst: aus der vollen Zeile (Postgres
 * liefert bei INSERT/UPDATE immer die komplette Row) werden nur status/significance/
 * agent_id/ended_at etc. gelesen, der Rest wird ignoriert.
 */

export interface AgentRunChangeRow {
  id: string
  agent_id: string | null
  parent_run_id: string | null
  trigger: string | null
  task: string | null
  status: RunStatus
  significance: Significance
  started_at: string | null
  ended_at: string | null
}

export type ConnectionStatus = 'connecting' | 'connected' | 'lost'

/** Abonniert INSERT/UPDATE auf public.agent_runs. Jeder Aufrufer bekommt einen eigenen
 * Channel (einfacher als einen Channel über CockpitExplorer/RunHistoryTable hinweg zu
 * teilen — beide sind unabhängige Geschwister-Komponenten ohne gemeinsamen Client-Vorfahren,
 * und mehrere Realtime-Channels auf dieselbe Tabelle sind ein von Supabase unterstütztes,
 * gängiges Muster, keine Fehlnutzung). */
export function useAgentRunsRealtime(onChange: (row: AgentRunChangeRow, eventType: 'INSERT' | 'UPDATE') => void) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`agent_runs_cockpit_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_runs' },
        (payload) => onChangeRef.current(payload.new as AgentRunChangeRow, 'INSERT')
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'agent_runs' },
        (payload) => onChangeRef.current(payload.new as AgentRunChangeRow, 'UPDATE')
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('connected')
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnectionStatus('lost')
        // 'CLOSED' tritt auch beim eigenen Cleanup-Unmount ein — dafür bewusst kein State-
        // Update mehr (Komponente ist dann schon weg bzw. baut gerade neu auf).
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { connectionStatus }
}
