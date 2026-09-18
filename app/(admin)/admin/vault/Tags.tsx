'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import type { VaultTag } from '@/lib/domain/vault'
import { createVaultTagAction, updateVaultTagAction, deleteVaultTagAction } from './actions'
import { ColorSwatchPicker } from './ColorSwatchPicker'
import { colorClasses, type FolderColorKey } from '@/lib/vault/colors'

const dmSans = { fontFamily: 'var(--font-dm-sans)' }

function PlusIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
function EditIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

export function TagChip({ tag, size = 'sm' }: { tag: VaultTag; size?: 'sm' | 'xs' }) {
  const c = colorClasses(tag.color)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${c.bg} ${c.text} ${
        size === 'xs' ? 'px-1.5 py-0.5 text-[0.65rem]' : 'px-2 py-0.5 text-xs'
      }`}
      style={dmSans}
    >
      {tag.name}
    </span>
  )
}

// ── Tag anlegen/bearbeiten (inline Formular) ────────────────────────────

function TagForm({
  tag,
  onDone,
  onCreated,
}: {
  tag?: VaultTag
  onDone: () => void
  onCreated?: (tag: VaultTag) => void
}) {
  const [name, setName] = useState(tag?.name ?? '')
  const [color, setColor] = useState<FolderColorKey | null>((tag?.color as FolderColorKey) ?? 'gray')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startSaving] = useTransition()

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name ist erforderlich.')
      return
    }
    setError(null)
    startSaving(async () => {
      if (tag) {
        const result = await updateVaultTagAction(tag.id, { name: trimmed, color: color ?? 'gray' })
        if (result.status === 'error') {
          setError(result.message)
          return
        }
        onDone()
      } else {
        const result = await createVaultTagAction(trimmed, color ?? 'gray')
        if (result.status === 'error') {
          setError(result.message)
          return
        }
        onCreated?.(result.tag)
        onDone()
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') onDone()
        }}
        disabled={isSaving}
        placeholder="Tag-Name…"
        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
        style={dmSans}
      />
      <ColorSwatchPicker value={color} onChange={setColor} disabled={isSaving} />
      {error && (
        <p className="text-xs text-red-500" style={dmSans}>
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} disabled={isSaving} className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors" style={dmSans}>
          Abbrechen
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={isSaving}
          className="px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          style={dmSans}
        >
          {isSaving ? '…' : tag ? 'Speichern' : 'Anlegen'}
        </button>
      </div>
    </div>
  )
}

// ── Sidebar-Sektion: Tags als Filter-Chips + Verwaltung ─────────────────

export function TagFilterBar({
  tags,
  activeTagIds,
  onToggle,
}: {
  tags: VaultTag[]
  activeTagIds: Set<string>
  onToggle: (id: string) => void
}) {
  const [managing, setManaging] = useState(false)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, startDelete] = useTransition()

  const handleDelete = (id: string) => {
    startDelete(async () => {
      await deleteVaultTagAction(id)
      setDeleteConfirmId(null)
    })
  }

  if (tags.length === 0 && !managing) {
    return (
      <button
        onClick={() => setManaging(true)}
        className="self-start text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
        style={dmSans}
      >
        + Tags anlegen
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 pt-2 mt-1 border-t border-gray-100 md:border-t-0 md:pt-0 md:mt-0">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide" style={dmSans}>
          Tags
        </p>
        <button onClick={() => setManaging((v) => !v)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors" style={dmSans}>
          {managing ? 'Fertig' : 'Verwalten'}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 px-1">
        {tags.map((tag) =>
          managing ? (
            editingId === tag.id ? null : (
              <span key={tag.id} className="inline-flex items-center gap-0.5">
                <TagChip tag={tag} size="xs" />
                {deleteConfirmId === tag.id ? (
                  <button
                    onClick={() => handleDelete(tag.id)}
                    disabled={isDeleting}
                    className="text-[0.65rem] font-semibold text-red-600 px-1"
                  >
                    Sicher?
                  </button>
                ) : (
                  <>
                    <button onClick={() => setEditingId(tag.id)} className="p-0.5 text-gray-400 hover:text-gray-700" title="Bearbeiten">
                      <EditIcon />
                    </button>
                    <button onClick={() => setDeleteConfirmId(tag.id)} className="p-0.5 text-gray-400 hover:text-red-600" title="Löschen">
                      <CloseIcon />
                    </button>
                  </>
                )}
              </span>
            )
          ) : (
            <button key={tag.id} onClick={() => onToggle(tag.id)} className={`transition-transform ${activeTagIds.has(tag.id) ? 'scale-105 ring-2 ring-gray-900 rounded-full' : ''}`}>
              <TagChip tag={tag} size="xs" />
            </button>
          )
        )}
        {managing && !editingId && (
          <button
            onClick={() => setEditingId('new')}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.65rem] font-medium text-gray-500 border border-dashed border-gray-300 rounded-full hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            <PlusIcon /> Neu
          </button>
        )}
      </div>

      {managing && editingId && (
        <TagForm tag={editingId === 'new' ? undefined : tags.find((t) => t.id === editingId)} onDone={() => setEditingId(null)} />
      )}
    </div>
  )
}

// ── Tag-Auswahl im Anlegen/Bearbeiten-Formular eines Eintrags ───────────

export function TagPicker({ tags, initialTagIds }: { tags: VaultTag[]; initialTagIds: string[] }) {
  const [selected, setSelected] = useState<string[]>(initialTagIds)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))

  return (
    <div className="flex flex-col gap-1.5">
      {selected.map((id) => (
        <input key={id} type="hidden" name="tag_id" value={id} />
      ))}
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((id) => {
          const tag = tags.find((t) => t.id === id)
          if (!tag) return null
          return (
            <span key={id} className="inline-flex items-center gap-1">
              <TagChip tag={tag} size="xs" />
              <button type="button" onClick={() => toggle(id)} className="text-gray-400 hover:text-red-500" title="Entfernen">
                <CloseIcon />
              </button>
            </span>
          )
        })}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-500 border border-dashed border-gray-300 rounded-full hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            <PlusIcon /> Tag
          </button>

          {open && (
            <div className="absolute left-0 top-full mt-1 z-20 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-2 flex flex-col gap-1">
              {tags.length === 0 && !creating && (
                <p className="text-xs text-gray-400 px-1.5 py-1" style={dmSans}>
                  Noch keine Tags.
                </p>
              )}
              {!creating &&
                tags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selected.includes(tag.id)} onChange={() => toggle(tag.id)} className="rounded border-gray-300 accent-gray-900" />
                    <TagChip tag={tag} size="xs" />
                  </label>
                ))}
              {creating ? (
                <TagForm
                  onDone={() => setCreating(false)}
                  onCreated={(tag) => {
                    setSelected((prev) => [...prev, tag.id])
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex items-center gap-1.5 px-1.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors border-t border-gray-100 mt-1 pt-1.5"
                  style={dmSans}
                >
                  <PlusIcon /> Neuer Tag
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
