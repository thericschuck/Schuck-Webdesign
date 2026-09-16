'use client'

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { VaultEntry, VaultAccessLogEntry } from '@/lib/domain/vault'
import {
  createVaultEntryAction,
  updateVaultEntryAction,
  deleteVaultEntryAction,
  revealVaultSecretAction,
  loadVaultAccessLogAction,
} from './actions'
import { PasswordGenerator } from './PasswordGenerator'
import { estimatePasswordStrength } from './password-strength'

type ActionResult = { status: 'error'; message: string } | { status: 'success' }

const dmSans = { fontFamily: 'var(--font-dm-sans)' }
const inputClass =
  'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50'
const labelClass = 'text-xs font-medium text-gray-500 block mb-1'

const REVEAL_TIMEOUT_MS = 20_000

const ACTION_LABEL: Record<VaultAccessLogEntry['action'], string> = {
  view: 'angezeigt',
  create: 'angelegt',
  update: 'bearbeitet',
  delete: 'gelöscht',
}

const STRENGTH_COLOR = ['bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-lime-500', 'bg-emerald-500']

const AVATAR_COLORS = [
  'bg-red-100 text-red-700',
  'bg-orange-100 text-orange-700',
  'bg-amber-100 text-amber-700',
  'bg-lime-100 text-lime-700',
  'bg-emerald-100 text-emerald-700',
  'bg-teal-100 text-teal-700',
  'bg-cyan-100 text-cyan-700',
  'bg-blue-100 text-blue-700',
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
]

function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Icons ─────────────────────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18M10.584 10.587a2 2 0 002.828 2.83M9.363 5.365A9.466 9.466 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411M6.423 6.423C4.462 7.79 3.06 9.75 2.458 12c.639 2.35 2.098 4.363 4.02 5.657"
      />
    </svg>
  )
}
function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
function EditIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
function UserIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
function KeyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 11-12 0 6 6 0 0112 0zM4 20l4.5-4.5" />
    </svg>
  )
}

// ── Board ─────────────────────────────────────────────────────────────────

export function VaultBoard({ entries }: { entries: VaultEntry[] }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of entries) {
      const key = e.category?.trim() || 'Ohne Kategorie'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0], 'de'))
  }, [entries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((entry) => {
      if (category !== null) {
        const key = entry.category?.trim() || 'Ohne Kategorie'
        if (key !== category) return false
      }
      if (!q) return true
      return (
        entry.title.toLowerCase().includes(q) ||
        (entry.username ?? '').toLowerCase().includes(q) ||
        (entry.url ?? '').toLowerCase().includes(q) ||
        (entry.category ?? '').toLowerCase().includes(q)
      )
    })
  }, [entries, search, category])

  const selectedEntry = selectedId && selectedId !== 'new' ? (entries.find((e) => e.id === selectedId) ?? null) : null
  // Ein gelöschter Eintrag verschwindet nach dem Server-Refresh (revalidatePath) aus
  // `entries` — das Panel blendet sich dann von selbst aus, ohne extra State-Sync.
  const showPanel = selectedId === 'new' || selectedEntry !== null

  return (
    <div className="flex flex-col md:flex-row gap-4 md:h-175">
      {/* ── Kategorien ──────────────────────────────────────────── */}
      <div className="md:w-48 shrink-0">
        <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
          <button
            onClick={() => setCategory(null)}
            className={`shrink-0 flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors ${
              category === null ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
            style={dmSans}
          >
            Alle Einträge
            <span className={`text-xs ${category === null ? 'text-white/60' : 'text-gray-400'}`}>{entries.length}</span>
          </button>
          {categories.map(([name, count]) => (
            <button
              key={name}
              onClick={() => setCategory(name)}
              className={`shrink-0 flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors ${
                category === name ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={dmSans}
            >
              <span className="truncate">{name}</span>
              <span className={`text-xs ${category === name ? 'text-white/60' : 'text-gray-400'}`}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Liste ───────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-gray-100 shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen…"
            className={inputClass}
            style={dmSans}
          />
          <button
            onClick={() => setSelectedId('new')}
            className="shrink-0 flex items-center gap-2 px-3.5 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
            style={dmSans}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Neu</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-12" style={dmSans}>
              {entries.length === 0 ? 'Noch keine Einträge im Tresor.' : 'Keine Treffer.'}
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filtered.map((entry) => (
                <EntryRow key={entry.id} entry={entry} active={entry.id === selectedId} onSelect={() => setSelectedId(entry.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Detail / Formular ──────────────────────────────────── */}
      {showPanel && (
        <div className="fixed inset-0 z-40 bg-white pt-14 md:pt-0 md:static md:z-auto md:w-105 md:shrink-0 md:rounded-2xl md:border md:border-gray-100 overflow-y-auto">
          <EntryPanel
            key={selectedId}
            entry={selectedEntry}
            onClose={() => setSelectedId(null)}
            onDeleted={() => setSelectedId(null)}
          />
        </div>
      )}
    </div>
  )
}

// ── Liste: eine Zeile ────────────────────────────────────────────────────

function EntryRow({ entry, active, onSelect }: { entry: VaultEntry; active: boolean; onSelect: () => void }) {
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null)
  const [isCopyingPassword, startCopyPassword] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const flashCopied = (field: 'username' | 'password') => {
    setCopiedField(field)
    setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 1500)
  }

  const copyUsername = async () => {
    if (!entry.username) return
    try {
      await navigator.clipboard.writeText(entry.username)
      flashCopied('username')
    } catch {
      setError('Kopieren fehlgeschlagen.')
    }
  }

  const copyPassword = () => {
    setError(null)
    startCopyPassword(async () => {
      const result = await revealVaultSecretAction(entry.id)
      if (result.status === 'error') {
        setError(result.message)
        return
      }
      try {
        await navigator.clipboard.writeText(result.password)
        flashCopied('password')
      } catch {
        setError('Kopieren fehlgeschlagen.')
      }
    })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer transition-colors ${
        active ? 'bg-gray-100' : 'hover:bg-gray-50'
      }`}
    >
      <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${avatarColor(entry.title)}`}>
        {entry.title.charAt(0).toUpperCase() || '?'}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-900 truncate" style={dmSans}>
          {entry.title}
        </span>
        <span className="block text-xs text-gray-400 truncate" style={dmSans}>
          {entry.username || entry.category || '—'}
        </span>
      </span>
      {error ? (
        <span className="text-xs text-red-500 shrink-0" style={dmSans}>
          {error}
        </span>
      ) : (
        <span className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0">
          {entry.username && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                copyUsername()
              }}
              title="Benutzername kopieren"
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg"
            >
              {copiedField === 'username' ? <CheckIcon /> : <UserIcon />}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              copyPassword()
            }}
            title="Passwort kopieren"
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg"
          >
            {isCopyingPassword ? <SpinnerIcon /> : copiedField === 'password' ? <CheckIcon /> : <KeyIcon />}
          </button>
        </span>
      )}
    </div>
  )
}

// ── Detail-Panel (Ansicht + Formular) ───────────────────────────────────

function EntryPanel({ entry, onClose, onDeleted }: { entry: VaultEntry | null; onClose: () => void; onDeleted: () => void }) {
  const isCreate = entry === null
  const [editing, setEditing] = useState(isCreate)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDelete] = useTransition()

  const handleDelete = () => {
    if (!entry) return
    setDeleteError(null)
    startDelete(async () => {
      const result = await deleteVaultEntryAction(entry.id)
      if (result.status === 'error') {
        setDeleteError(result.message)
        setConfirmDelete(false)
        return
      }
      onDeleted()
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <h2 className="text-sm font-semibold text-gray-900" style={dmSans}>
          {isCreate ? 'Neuer Eintrag' : editing ? 'Eintrag bearbeiten' : 'Details'}
        </h2>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" aria-label="Schließen">
          <CloseIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {editing ? (
          <EntryForm mode={isCreate ? 'create' : 'edit'} entry={entry ?? undefined} onDone={() => (isCreate ? onClose() : setEditing(false))} />
        ) : entry ? (
          <EntryView entry={entry} />
        ) : null}
      </div>

      {!isCreate && entry && !editing && (
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 shrink-0">
          {confirmDelete ? (
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs text-gray-500 flex-1" style={dmSans}>
                Wirklich löschen?
              </span>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                style={dmSans}
              >
                {isDeleting ? '…' : 'Löschen'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
                className="px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                style={dmSans}
              >
                Nein
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                style={dmSans}
              >
                <EditIcon /> Bearbeiten
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                style={dmSans}
              >
                <TrashIcon /> Löschen
              </button>
            </>
          )}
          {deleteError && (
            <p className="text-xs text-red-600" style={dmSans}>
              {deleteError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={labelClass} style={dmSans}>
        {label}
      </p>
      <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">{children}</div>
    </div>
  )
}

function IconButton({
  onClick,
  title,
  disabled,
  children,
}: {
  onClick: () => void
  title: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg disabled:opacity-50 transition-colors shrink-0"
    >
      {children}
    </button>
  )
}

function EntryView({ entry }: { entry: VaultEntry }) {
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null)
  const [revealError, setRevealError] = useState<string | null>(null)
  const [isRevealing, startReveal] = useTransition()
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null)
  const [history, setHistory] = useState<VaultAccessLogEntry[] | null>(null)
  const [isHistoryLoading, startHistoryLoad] = useTransition()
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // EntryView wird pro Auswahl frisch gemountet (key={selectedId} im Board), daher
    // starten revealedPassword/history hier bereits bei null — nur der Verlauf muss
    // einmal nachgeladen werden.
    startHistoryLoad(async () => {
      const log = await loadVaultAccessLogAction(entry.id)
      setHistory(log)
    })
  }, [entry.id, startHistoryLoad])

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    },
    []
  )

  const flash = (field: 'username' | 'password') => {
    setCopiedField(field)
    setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 1500)
  }

  const copyText = async (text: string, field: 'username' | 'password') => {
    try {
      await navigator.clipboard.writeText(text)
      flash(field)
    } catch {
      setRevealError('Kopieren fehlgeschlagen.')
    }
  }

  const handleReveal = () => {
    setRevealError(null)
    startReveal(async () => {
      const result = await revealVaultSecretAction(entry.id)
      if (result.status === 'error') {
        setRevealError(result.message)
        return
      }
      setRevealedPassword(result.password)
      setHistory(null)
      if (hideTimer.current) clearTimeout(hideTimer.current)
      hideTimer.current = setTimeout(() => setRevealedPassword(null), REVEAL_TIMEOUT_MS)
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-lg font-semibold ${avatarColor(entry.title)}`}>
          {entry.title.charAt(0).toUpperCase() || '?'}
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold text-gray-900 truncate" style={dmSans}>
            {entry.title}
          </p>
          {entry.category && (
            <p className="text-xs text-gray-400" style={dmSans}>
              {entry.category}
            </p>
          )}
        </div>
      </div>

      {entry.username && (
        <Field label="Benutzername">
          <span className="flex-1 text-sm text-gray-900 truncate" style={dmSans}>
            {entry.username}
          </span>
          <IconButton onClick={() => copyText(entry.username ?? '', 'username')} title="Kopieren">
            {copiedField === 'username' ? <CheckIcon /> : <CopyIcon />}
          </IconButton>
        </Field>
      )}

      <Field label="Passwort">
        {revealedPassword !== null ? (
          <>
            <code className="flex-1 text-sm text-gray-900 break-all">{revealedPassword}</code>
            <IconButton onClick={() => copyText(revealedPassword, 'password')} title="Kopieren">
              {copiedField === 'password' ? <CheckIcon /> : <CopyIcon />}
            </IconButton>
            <IconButton onClick={() => setRevealedPassword(null)} title="Verbergen">
              <EyeOffIcon />
            </IconButton>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm text-gray-400 tracking-widest" style={dmSans}>
              ••••••••••••
            </span>
            <IconButton onClick={handleReveal} title="Anzeigen" disabled={isRevealing}>
              {isRevealing ? <SpinnerIcon /> : <EyeIcon />}
            </IconButton>
          </>
        )}
      </Field>
      {revealError && (
        <p className="text-xs text-red-600 -mt-3" style={dmSans}>
          {revealError}
        </p>
      )}

      {entry.url && (
        <Field label="URL">
          <a href={entry.url} target="_blank" rel="noreferrer" className="flex-1 text-sm text-gray-900 truncate hover:underline" style={dmSans}>
            {entry.url}
          </a>
        </Field>
      )}

      {entry.notes && (
        <div>
          <p className={labelClass} style={dmSans}>
            Notizen
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap" style={dmSans}>
            {entry.notes}
          </p>
        </div>
      )}

      <div className="pt-3 border-t border-gray-100 text-xs text-gray-400 flex flex-col gap-0.5" style={dmSans}>
        {entry.created_by_name && (
          <span>
            Angelegt von {entry.created_by_name} · {formatDateTime(entry.created_at)}
          </span>
        )}
        {entry.updated_by_name && entry.updated_at !== entry.created_at && (
          <span>
            Zuletzt bearbeitet von {entry.updated_by_name} · {formatDateTime(entry.updated_at)}
          </span>
        )}
      </div>

      <div>
        <p className={labelClass} style={dmSans}>
          Verlauf
        </p>
        {isHistoryLoading && history === null ? (
          <p className="text-xs text-gray-400" style={dmSans}>
            Lade…
          </p>
        ) : history && history.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {history.map((h) => (
              <li key={h.id} className="text-xs text-gray-400" style={dmSans}>
                <span className="text-gray-600">{h.accessed_by_name ?? 'Unbekannt'}</span> hat den Eintrag {ACTION_LABEL[h.action]} ·{' '}
                {formatDateTime(h.accessed_at)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400" style={dmSans}>
            Noch keine Zugriffe protokolliert.
          </p>
        )}
      </div>
    </div>
  )
}

function EntryForm({ mode, entry, onDone }: { mode: 'create' | 'edit'; entry?: VaultEntry; onDone: () => void }) {
  const action = mode === 'create' ? createVaultEntryAction : updateVaultEntryAction
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null)
  const formRef = useRef<HTMLFormElement>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const strength = estimatePasswordStrength(password)

  useEffect(() => {
    if (state?.status === 'success') {
      formRef.current?.reset()
      onDone()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      {mode === 'edit' && entry && <input type="hidden" name="id" value={entry.id} />}

      <div>
        <label className={labelClass} style={dmSans}>
          Titel
        </label>
        <input
          name="title"
          type="text"
          required
          autoFocus
          disabled={pending}
          defaultValue={entry?.title ?? ''}
          placeholder="z.B. Vercel-Team, Domain-Registrar…"
          className={inputClass}
          style={dmSans}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={dmSans}>
            Benutzername
          </label>
          <input name="username" type="text" disabled={pending} defaultValue={entry?.username ?? ''} className={inputClass} style={dmSans} />
        </div>
        <div>
          <label className={labelClass} style={dmSans}>
            Kategorie
          </label>
          <input
            name="category"
            type="text"
            disabled={pending}
            defaultValue={entry?.category ?? ''}
            placeholder="Hosting, Domain, E-Mail…"
            className={inputClass}
            style={dmSans}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelClass} style={{ ...dmSans, marginBottom: 0 }}>
            {mode === 'edit' ? 'Neues Passwort (leer lassen = unverändert)' : 'Passwort'}
          </label>
          <PasswordGenerator disabled={pending} onGenerate={setPassword} />
        </div>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            required={mode === 'create'}
            disabled={pending}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} pr-16`}
            style={dmSans}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            style={dmSans}
          >
            {showPassword ? 'Verbergen' : 'Anzeigen'}
          </button>
        </div>
        {password && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden flex gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className={`flex-1 rounded-full ${i <= strength.score ? STRENGTH_COLOR[strength.score] : 'bg-gray-100'}`} />
              ))}
            </div>
            <span className="text-xs text-gray-400 shrink-0" style={dmSans}>
              {strength.label}
            </span>
          </div>
        )}
      </div>

      <div>
        <label className={labelClass} style={dmSans}>
          URL
        </label>
        <input name="url" type="text" disabled={pending} defaultValue={entry?.url ?? ''} placeholder="https://…" className={inputClass} style={dmSans} />
      </div>

      <div>
        <label className={labelClass} style={dmSans}>
          Notizen
        </label>
        <textarea name="notes" rows={2} disabled={pending} defaultValue={entry?.notes ?? ''} className={inputClass} style={dmSans} />
      </div>

      {state?.status === 'error' && (
        <p className="text-xs text-red-600" style={dmSans}>
          {state.message}
        </p>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={onDone}
          disabled={pending}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          style={dmSans}
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
          style={dmSans}
        >
          {pending ? 'Speichern…' : mode === 'create' ? 'Anlegen' : 'Speichern'}
        </button>
      </div>
    </form>
  )
}
