'use client'

import { useEffect, useRef, useState } from 'react'
import { History, Plus } from 'lucide-react'
import { listConversations } from '@/lib/helm/actions/conversations'
import type { HelmConversationSummary } from '@/lib/helm/persistence'

/** Kompakter Session-Umschalter für das schwebende Widget — keine volle Sidebar (zu schmal),
 * stattdessen ein Popover mit den letzten Konversationen + "Neuer Chat" (Athenas
 * SessionPicker-Pattern, hier ohne Umbenennen/Löschen — das bleibt der Vollbild-Sidebar
 * vorbehalten). */
export function HelmSessionPicker({
  activeId,
  onSelect,
  onCreate,
}: {
  activeId?: string
  onSelect: (id: string) => void
  onCreate: () => void
}) {
  const [open, setOpen] = useState(false)
  const [sessions, setSessions] = useState<HelmConversationSummary[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    // Daten-Fetch beim Öffnen — setLoading hier ist der Auslöser, nicht abgeleiteter Zustand.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    listConversations()
      .then(setSessions)
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Verlauf"
        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors"
      >
        <History className="size-4" />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-20 mt-2 w-64 max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-[#151515] p-2 shadow-2xl shadow-black/50">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onCreate()
            }}
            className="mb-1 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white"
          >
            <Plus className="size-3.5" />
            Neuer Chat
          </button>

          {loading && <p className="px-2 py-3 text-center text-xs text-white/30">Lädt…</p>}
          {!loading && sessions.length === 0 && <p className="px-2 py-3 text-center text-xs text-white/30">Keine Konversationen.</p>}

          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setOpen(false)
                onSelect(s.id)
              }}
              className={`w-full truncate rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/8 ${
                s.id === activeId ? 'bg-violet-400/12 text-white' : 'text-white/60'
              }`}
            >
              {s.title ?? 'Neuer Chat'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
