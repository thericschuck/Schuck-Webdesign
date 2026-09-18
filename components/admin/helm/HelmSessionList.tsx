'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pin, Pencil, Trash2, Plus, Check, X } from 'lucide-react'
import { createConversation, deleteConversation, renameConversation, togglePinConversation } from '@/lib/helm/actions/conversations'
import type { HelmConversationSummary } from '@/lib/helm/persistence'

function relativeDay(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86_400_000)
  if (diffDays <= 0) return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Gestern'
  if (diffDays < 7) return date.toLocaleDateString('de-DE', { weekday: 'short' })
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

function SessionRow({ session, active }: { session: HelmConversationSummary; active: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(session.title ?? '')
  const [, startTransition] = useTransition()

  function commitRename() {
    setEditing(false)
    const trimmed = title.trim()
    if (!trimmed || trimmed === session.title) return
    startTransition(async () => {
      await renameConversation(session.id, trimmed)
      router.refresh()
    })
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-2 py-1.5">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="min-w-0 flex-1 rounded-md border border-white/15 bg-black/30 px-2 py-1 text-xs text-white outline-none focus:border-violet-400/50"
        />
        <button type="button" onClick={commitRename} className="p-1 text-emerald-400 hover:text-emerald-300">
          <Check className="size-3.5" />
        </button>
        <button type="button" onClick={() => setEditing(false)} className="p-1 text-white/40 hover:text-white">
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors ${
        active ? 'bg-violet-400/12 border border-violet-400/20' : 'hover:bg-white/5 border border-transparent'
      }`}
    >
      <Link href={`/admin/helm?c=${session.id}`} className="min-w-0 flex-1">
        <p className={`truncate text-xs ${active ? 'text-white' : 'text-white/70'}`}>{session.title ?? 'Neuer Chat'}</p>
        <p className="text-[10px] text-white/30">{relativeDay(session.updatedAt)}</p>
      </Link>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          title={session.pinned ? 'Lösen' : 'Anpinnen'}
          onClick={() =>
            startTransition(async () => {
              await togglePinConversation(session.id, !session.pinned)
              router.refresh()
            })
          }
          className={`p-1 rounded transition-colors hover:bg-white/10 ${session.pinned ? 'text-amber-300' : 'text-white/30 hover:text-white'}`}
        >
          <Pin className="size-3" fill={session.pinned ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          title="Umbenennen"
          onClick={() => {
            setTitle(session.title ?? '')
            setEditing(true)
          }}
          className="p-1 rounded text-white/30 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Pencil className="size-3" />
        </button>
        <button
          type="button"
          title="Löschen"
          onClick={() =>
            startTransition(async () => {
              await deleteConversation(session.id)
              if (active) router.push('/admin/helm')
              router.refresh()
            })
          }
          className="p-1 rounded text-white/30 transition-colors hover:bg-white/10 hover:text-red-400"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  )
}

export function HelmSessionList({ sessions, activeId }: { sessions: HelmConversationSummary[]; activeId?: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto p-2">
      <button
        type="button"
        onClick={() =>
          startTransition(async () => {
            const { id } = await createConversation()
            router.push(`/admin/helm?c=${id}`)
          })
        }
        className="mb-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-xs font-medium text-white/70 transition-colors hover:border-violet-400/40 hover:text-white"
      >
        <Plus className="size-3.5" />
        Neuer Chat
      </button>

      {sessions.length === 0 && <p className="px-2 py-4 text-center text-xs text-white/30">Noch keine Konversationen.</p>}

      {sessions.map((session) => (
        <SessionRow key={session.id} session={session} active={session.id === activeId} />
      ))}
    </div>
  )
}
