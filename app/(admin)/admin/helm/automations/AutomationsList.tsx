'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Play, Trash2 } from 'lucide-react'
import { deleteAutomation, runAutomationNow, toggleAutomationStatus } from '@/lib/helm/actions/automations'

export interface AutomationRow {
  id: string
  label: string
  agentLabel: string
  recurrence: 'daily' | 'weekly'
  weekday: number | null
  timeOfDay: string
  status: 'active' | 'paused'
  lastRunAt: string | null
  lastRunStatus: string | null
  nextRunAt: string
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

function formatSchedule(row: AutomationRow): string {
  const time = row.timeOfDay.slice(0, 5)
  if (row.recurrence === 'daily') return `Täglich ${time}`
  return `${WEEKDAYS[row.weekday ?? 0]}s ${time}`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const STATUS_DOT: Record<string, string> = {
  succeeded: 'bg-emerald-400',
  failed: 'bg-red-400',
  running: 'bg-amber-400 animate-pulse',
}

export function AutomationsList({ rows }: { rows: AutomationRow[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-white/40">Noch keine Automationen angelegt.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-white">{row.label}</p>
              {row.status === 'paused' && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">Pausiert</span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-white/40">
              {row.agentLabel} · {formatSchedule(row)}
            </p>
          </div>

          <div className="text-xs text-white/40">
            <p className="flex items-center gap-1.5">
              {row.lastRunStatus && <span className={`size-1.5 rounded-full ${STATUS_DOT[row.lastRunStatus] ?? 'bg-white/30'}`} />}
              Letzter Lauf: {formatDateTime(row.lastRunAt)}
            </p>
            <p>Nächster Lauf: {row.status === 'active' ? formatDateTime(row.nextRunAt) : '—'}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              title="Jetzt ausführen"
              onClick={() => startTransition(async () => {
                await runAutomationNow(row.id)
                router.refresh()
              })}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors"
            >
              <Play className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  await toggleAutomationStatus(row.id, row.status === 'active' ? 'paused' : 'active')
                  router.refresh()
                })
              }
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                row.status === 'active' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/8 text-white/50'
              }`}
            >
              {row.status === 'active' ? 'Aktiv' : 'Pausiert'}
            </button>
            <Link
              href={`/admin/helm/automations/${row.id}/edit`}
              title="Bearbeiten"
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors"
            >
              <Pencil className="size-3.5" />
            </Link>
            <button
              type="button"
              title="Löschen"
              onClick={() =>
                startTransition(async () => {
                  await deleteAutomation(row.id)
                  router.refresh()
                })
              }
              className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/8 transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
