'use client'

import { useActionState, useState } from 'react'
import { SUBAGENTS } from '@/lib/helm/subagents'

type ActionResult = { status: 'error'; message: string } | null
type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>

const AGENT_OPTIONS = [{ value: 'orchestrator', label: 'Orchestrator' }, ...SUBAGENTS.map((s) => ({ value: s.name, label: s.label }))]
const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none focus:border-violet-400/50 disabled:opacity-50 transition-colors placeholder:text-white/25'
const labelClass = 'text-xs font-medium text-white/50 block mb-1.5'

export interface AutomationFormValues {
  label: string
  agentSlug: string
  task: string
  recurrence: 'daily' | 'weekly'
  weekday: number | null
  timeOfDay: string
}

export function AutomationForm({
  action,
  initial,
  submitLabel,
}: {
  action: FormAction
  initial?: AutomationFormValues
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null)
  const [recurrence, setRecurrence] = useState<'daily' | 'weekly'>(initial?.recurrence ?? 'daily')

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="label" className={labelClass}>
          Bezeichnung
        </label>
        <input id="label" name="label" required defaultValue={initial?.label} disabled={pending} placeholder="z.B. Care-Agent Montag" className={fieldClass} />
      </div>

      <div>
        <label htmlFor="agent_slug" className={labelClass}>
          Ziel-Agent
        </label>
        <select id="agent_slug" name="agent_slug" required defaultValue={initial?.agentSlug ?? 'orchestrator'} disabled={pending} className={fieldClass}>
          {AGENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="task" className={labelClass}>
          Aufgabe
        </label>
        <textarea
          id="task"
          name="task"
          required
          rows={3}
          defaultValue={initial?.task}
          disabled={pending}
          placeholder="Was soll der Agent tun? z.B. „Erstelle den Monatsbericht für alle Care-Kunden.“"
          className={`${fieldClass} resize-none`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-3 items-end">
        <div>
          <label className={labelClass}>Rhythmus</label>
          <div className="flex gap-1 rounded-xl border border-white/10 p-1">
            {(['daily', 'weekly'] as const).map((r) => (
              <label
                key={r}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  recurrence === r ? 'bg-violet-400/90 text-[#0d0d0d] font-medium' : 'text-white/50 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="recurrence"
                  value={r}
                  checked={recurrence === r}
                  onChange={() => setRecurrence(r)}
                  disabled={pending}
                  className="sr-only"
                />
                {r === 'daily' ? 'Täglich' : 'Wöchentlich'}
              </label>
            ))}
          </div>
        </div>

        {recurrence === 'weekly' && (
          <div>
            <label htmlFor="weekday" className={labelClass}>
              Wochentag
            </label>
            <select id="weekday" name="weekday" defaultValue={initial?.weekday ?? 1} disabled={pending} className={fieldClass}>
              {WEEKDAYS.map((label, value) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="time_of_day" className={labelClass}>
            Uhrzeit
          </label>
          <input
            id="time_of_day"
            name="time_of_day"
            type="time"
            required
            defaultValue={initial?.timeOfDay?.slice(0, 5) ?? '08:00'}
            disabled={pending}
            className={fieldClass}
          />
        </div>
      </div>

      <p className="text-[11px] text-white/30">
        Zeiten gelten für Europe/Berlin und sind ungefähr — Sommer-/Winterzeit wird nicht speziell behandelt, an
        DST-Wechseltagen kann ein Lauf bis zu 1h abweichen.
      </p>

      {state?.status === 'error' && <p className="text-sm text-red-400">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-full rounded-xl bg-violet-400/90 hover:bg-violet-400 py-2.5 text-sm font-medium text-[#0d0d0d] transition-colors disabled:opacity-50"
      >
        {pending ? `${submitLabel}…` : submitLabel}
      </button>
    </form>
  )
}
