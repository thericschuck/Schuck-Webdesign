'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { VaultEntry, VaultFolder } from '@/lib/domain/vault'
import { createVaultFolderAction, updateVaultFolderAction, deleteVaultFolderAction } from './actions'
import { ColorSwatchPicker } from './ColorSwatchPicker'
import { colorClasses, type FolderColorKey } from '@/lib/vault/colors'

const dmSans = { fontFamily: 'var(--font-dm-sans)' }

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}
function FolderIcon({ color }: { color: string | null }) {
  return <span className={`w-2 h-2 rounded-full shrink-0 ${colorClasses(color).dot}`} />
}
function PlusIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
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
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

interface TreeNode {
  folder: VaultFolder
  children: TreeNode[]
}

function buildTree(folders: VaultFolder[]): TreeNode[] {
  const byId = new Map<string, TreeNode>(folders.map((f) => [f.id, { folder: f, children: [] }]))
  const roots: TreeNode[] = []
  for (const f of folders) {
    const node = byId.get(f.id)!
    const parent = f.parent_id ? byId.get(f.parent_id) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.folder.name.localeCompare(b.folder.name, 'de'))
    nodes.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

/** Alle Nachfahren-IDs von `folderId` (inkl. sich selbst) — für den "Verschieben nach"-Auswahl,
 * damit ein Ordner nicht in einen seiner eigenen Unterordner verschoben werden kann. */
function subtreeIds(folderId: string, folders: VaultFolder[]): Set<string> {
  const ids = new Set<string>([folderId])
  let grew = true
  while (grew) {
    grew = false
    for (const f of folders) {
      if (f.parent_id && ids.has(f.parent_id) && !ids.has(f.id)) {
        ids.add(f.id)
        grew = true
      }
    }
  }
  return ids
}

/** Flache, tiefensortierte Liste für <select>-Dropdowns — Einrückung per Präfix
 * macht die Hierarchie auch ohne echten Baum sichtbar. */
export function flattenFoldersForSelect(folders: VaultFolder[]): { id: string; label: string }[] {
  const tree = buildTree(folders)
  const out: { id: string; label: string }[] = []
  const walk = (nodes: TreeNode[], depth: number) => {
    for (const node of nodes) {
      out.push({ id: node.folder.id, label: `${'  '.repeat(depth)}${depth > 0 ? '↳ ' : ''}${node.folder.name}` })
      walk(node.children, depth + 1)
    }
  }
  walk(tree, 0)
  return out
}

type EditorTarget = 'new-root' | { newChildOf: string } | { editId: string }

// ── Inline Formular: Neuer Ordner / Umbenennen / Verschieben / Farbe ────────

function FolderForm({
  folders,
  target,
  onDone,
}: {
  folders: VaultFolder[]
  target: EditorTarget
  onDone: () => void
}) {
  const editingFolder = typeof target === 'object' && 'editId' in target ? folders.find((f) => f.id === target.editId) : undefined
  const fixedParentId = typeof target === 'object' && 'newChildOf' in target ? target.newChildOf : undefined

  const [name, setName] = useState(editingFolder?.name ?? '')
  const [color, setColor] = useState<FolderColorKey | null>((editingFolder?.color as FolderColorKey) ?? 'gray')
  const [parentId, setParentId] = useState<string>(fixedParentId ?? editingFolder?.parent_id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startSaving] = useTransition()

  const excludedIds = editingFolder ? subtreeIds(editingFolder.id, folders) : new Set<string>()
  const parentOptions = folders.filter((f) => !excludedIds.has(f.id))

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name ist erforderlich.')
      return
    }
    setError(null)
    startSaving(async () => {
      const result = editingFolder
        ? await updateVaultFolderAction(editingFolder.id, { name: trimmed, parentId: parentId || null, color })
        : await createVaultFolderAction(trimmed, { parentId: fixedParentId ?? (parentId || null), color })
      if (result.status === 'error') {
        setError(result.message)
        return
      }
      onDone()
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
        placeholder="Ordnername…"
        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
        style={dmSans}
      />
      <ColorSwatchPicker value={color} onChange={setColor} disabled={isSaving} />
      {editingFolder && (
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          disabled={isSaving}
          className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          style={dmSans}
        >
          <option value="">Kein übergeordneter Ordner</option>
          {parentOptions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      )}
      {error && (
        <p className="text-xs text-red-500" style={dmSans}>
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          disabled={isSaving}
          className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          style={dmSans}
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={isSaving}
          className="px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          style={dmSans}
        >
          {isSaving ? '…' : editingFolder ? 'Speichern' : 'Anlegen'}
        </button>
      </div>
    </div>
  )
}

// ── Eine Zeile im Baum (rekursiv für Unterordner) ───────────────────────────

function FolderRow({
  node,
  depth,
  countByFolder,
  activeId,
  onSelect,
  editorTarget,
  onSetEditorTarget,
  onCloseEditor,
  folders,
}: {
  node: TreeNode
  depth: number
  countByFolder: Map<string, number>
  activeId: string | null
  onSelect: (id: string) => void
  editorTarget: EditorTarget | null
  onSetEditorTarget: (t: EditorTarget | null) => void
  onCloseEditor: () => void
  folders: VaultFolder[]
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, startDelete] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { folder, children } = node
  const active = activeId === folder.id
  const count = countByFolder.get(folder.id) ?? 0
  const isEditingThis = editorTarget !== null && typeof editorTarget === 'object' && 'editId' in editorTarget && editorTarget.editId === folder.id
  const isAddingChild = editorTarget !== null && typeof editorTarget === 'object' && 'newChildOf' in editorTarget && editorTarget.newChildOf === folder.id

  const handleDelete = () => {
    startDelete(async () => {
      const result = await deleteVaultFolderAction(folder.id)
      if (result.status === 'error') {
        setDeleteError(result.message)
        setConfirmDelete(false)
        return
      }
    })
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-xl text-sm transition-colors ${
          active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${depth * 0.875}rem` }}
      >
        {children.length > 0 ? (
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={`shrink-0 p-1 ${active ? 'text-white/70' : 'text-gray-400'}`}
            aria-label={collapsed ? 'Aufklappen' : 'Zuklappen'}
          >
            <ChevronIcon open={!collapsed} />
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <button onClick={() => onSelect(folder.id)} className="flex-1 min-w-0 flex items-center gap-2 py-2 text-left" style={dmSans}>
          <FolderIcon color={folder.color} />
          <span className="flex-1 min-w-0 truncate">{folder.name}</span>
          <span className={`text-xs shrink-0 ${active ? 'text-white/60' : 'text-gray-400'}`}>{count}</span>
        </button>
        {/* Immer sichtbar statt nur bei :hover — auf Touch-Geräten gibt es keinen Hover-State. */}
        <span className={`flex items-center pr-1.5 gap-0.5 transition-opacity ${active ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
          {confirmDelete ? (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`text-xs font-semibold px-1.5 whitespace-nowrap ${active ? 'text-white' : 'text-red-600'}`}
            >
              Sicher?
            </button>
          ) : (
            <>
              <button
                onClick={() => onSetEditorTarget({ newChildOf: folder.id })}
                title="Unterordner hinzufügen"
                className={`p-1 rounded ${active ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
              >
                <PlusIcon />
              </button>
              <button
                onClick={() => onSetEditorTarget({ editId: folder.id })}
                title="Bearbeiten"
                className={`p-1 rounded ${active ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
              >
                <EditIcon />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                title="Löschen"
                className={`p-1 rounded ${active ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-red-600'}`}
              >
                <TrashIcon />
              </button>
            </>
          )}
        </span>
        {deleteError && (
          <span className="text-xs text-red-500 px-2" style={dmSans}>
            {deleteError}
          </span>
        )}
      </div>

      {isEditingThis && (
        <div style={{ paddingLeft: `${depth * 0.875}rem` }} className="pt-1">
          <FolderForm folders={folders} target={editorTarget!} onDone={onCloseEditor} />
        </div>
      )}
      {isAddingChild && (
        <div style={{ paddingLeft: `${(depth + 1) * 0.875}rem` }} className="pt-1">
          <FolderForm folders={folders} target={editorTarget!} onDone={onCloseEditor} />
        </div>
      )}

      {!collapsed && children.length > 0 && (
        <div>
          {children.map((child) => (
            <FolderRow
              key={child.folder.id}
              node={child}
              depth={depth + 1}
              countByFolder={countByFolder}
              activeId={activeId}
              onSelect={onSelect}
              editorTarget={editorTarget}
              onSetEditorTarget={onSetEditorTarget}
              onCloseEditor={onCloseEditor}
              folders={folders}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Öffentliche Komponente ───────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

export function FolderTree({
  folders,
  entries,
  folderFilter,
  onSelectFilter,
}: {
  folders: VaultFolder[]
  entries: VaultEntry[]
  folderFilter: string | null
  onSelectFilter: (id: string | null) => void
}) {
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null)

  // Direkte Treffer pro Ordner (wie viele Einträge liegen unmittelbar darin) —
  // passt zur Baumnavigation im Hauptbereich, die ebenfalls nach direkter
  // Zuordnung filtert statt rekursiv über Unterordner zu summieren. Ein Eintrag
  // in mehreren Ordnern (n:m) zählt bei jedem seiner Ordner einzeln mit.
  const countByFolder = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of entries) {
      for (const f of e.folders) {
        counts.set(f.id, (counts.get(f.id) ?? 0) + 1)
      }
    }
    return counts
  }, [entries])

  const tree = useMemo(() => buildTree(folders), [folders])

  return (
    <div className="flex flex-col gap-1 md:flex-1 md:min-h-0">
      <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto pb-1 md:pb-0 md:flex-1">
        <button
          onClick={() => onSelectFilter(null)}
          className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors ${
            folderFilter === null ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
          style={dmSans}
        >
          <HomeIcon />
          <span className="flex-1 min-w-0 truncate">Start</span>
          <span className={`text-xs shrink-0 ${folderFilter === null ? 'text-white/60' : 'text-gray-400'}`}>{entries.length}</span>
        </button>

        {/* Ordner hängen optisch als Baum unter "Start" — Einrückung + Linie wie im
            Datei-Explorer, nur auf Desktop (die mobile Chip-Reihe bleibt flach). */}
        <div className="contents md:flex md:flex-col md:gap-1 md:pl-3 md:ml-3.5 md:border-l md:border-gray-100">
          {tree.map((node) => (
            <FolderRow
              key={node.folder.id}
              node={node}
              depth={0}
              countByFolder={countByFolder}
              activeId={folderFilter}
              onSelect={onSelectFilter}
              editorTarget={editorTarget}
              onSetEditorTarget={setEditorTarget}
              onCloseEditor={() => setEditorTarget(null)}
              folders={folders}
            />
          ))}
        </div>
      </div>

      {editorTarget === 'new-root' ? (
        <FolderForm folders={folders} target="new-root" onDone={() => setEditorTarget(null)} />
      ) : (
        <button
          onClick={() => setEditorTarget('new-root')}
          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          style={dmSans}
        >
          <PlusIcon /> Neuer Ordner
        </button>
      )}
    </div>
  )
}

// ── Ordner-Chip (Anzeige, z.B. Detail-Panel) ────────────────────────────

export function FolderChip({ folder, size = 'sm' }: { folder: { name: string; color: string | null }; size?: 'sm' | 'xs' }) {
  const c = colorClasses(folder.color)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${c.bg} ${c.text} ${
        size === 'xs' ? 'px-1.5 py-0.5 text-[0.65rem]' : 'px-2 py-0.5 text-xs'
      }`}
      style={dmSans}
    >
      <FolderGlyphIcon />
      {folder.name}
    </span>
  )
}

function FolderGlyphIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  )
}

// ── Ordner-Auswahl im Anlegen/Bearbeiten-Formular eines Eintrags ────────
// Ein Eintrag kann in mehreren Ordnern gleichzeitig liegen (n:m) — z.B. eine
// .env-Datei sowohl unter "Projekte/Kunde X" als auch unter ".env-Dateien".

export function FolderPicker({ folders, initialFolderIds }: { folders: VaultFolder[]; initialFolderIds: string[] }) {
  const [selected, setSelected] = useState<string[]>(initialFolderIds)
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const options = useMemo(() => flattenFoldersForSelect(folders), [folders])
  const byId = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]))

  return (
    <div className="flex flex-col gap-1.5">
      {selected.map((id) => (
        <input key={id} type="hidden" name="folder_id" value={id} />
      ))}
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((id) => {
          const folder = byId.get(id)
          if (!folder) return null
          return (
            <span key={id} className="inline-flex items-center gap-1">
              <FolderChip folder={folder} size="xs" />
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
            <PlusIcon /> Ordner
          </button>

          {open && (
            <div className="absolute left-0 top-full mt-1 z-20 w-56 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg p-2 flex flex-col gap-1">
              {options.length === 0 ? (
                <p className="text-xs text-gray-400 px-1.5 py-1" style={dmSans}>
                  Noch keine Ordner.
                </p>
              ) : (
                options.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selected.includes(opt.id)} onChange={() => toggle(opt.id)} className="rounded border-gray-300 accent-gray-900" />
                    <span className="text-sm text-gray-700 whitespace-pre truncate" style={dmSans}>
                      {opt.label}
                    </span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
