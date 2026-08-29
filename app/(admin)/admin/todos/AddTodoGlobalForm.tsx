'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/admin/Modal'
import { addTodo } from '@/app/(admin)/admin/projects/[id]/actions'

type ActionResult = { status: 'error'; message: string } | { status: 'success' }
type ProjectOption = { id: string; title: string }

const selectClass =
  'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white disabled:opacity-50'
const labelClass = 'text-xs font-medium text-gray-500 block mb-1'

export function AddTodoGlobalForm({
  projects,
  defaultProjectId = null,
}: {
  projects: ProjectOption[]
  /** Vorauswahl für den Projekt-Select — z.B. das gerade in der Kategorie-Rail aktive Projekt.
   * Bleibt frei änderbar, da nur `defaultValue` (uncontrolled) statt `value` gesetzt wird. */
  defaultProjectId?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(addTodo, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.status === 'success') {
      formRef.current?.reset()
      setOpen(false)
    }
  }, [state])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Aufgabe hinzufügen
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Neue Aufgabe">
        <form ref={formRef} action={action} className="flex flex-col gap-3">
          <input
            name="title"
            type="text"
            required
            autoFocus
            disabled={pending}
            placeholder="Was muss erledigt werden?"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className={labelClass} style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Projekt
              </label>
              <select
                name="project_id"
                disabled={pending}
                defaultValue={defaultProjectId ?? ''}
                className={selectClass}
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                <option value="">Allgemein (kein Projekt)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Priorität
              </label>
              <select name="priority" defaultValue="medium" disabled={pending} className={selectClass} style={{ fontFamily: 'var(--font-dm-sans)' }}>
                <option value="high">Hoch</option>
                <option value="medium">Mittel</option>
                <option value="low">Niedrig</option>
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Fällig bis (optional)
              </label>
              <input name="due_date" type="date" disabled={pending} className={selectClass} />
            </div>
          </div>
          {state?.status === 'error' && (
            <p className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>{state.message}</p>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {pending ? 'Hinzufügen…' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
