'use client'

import { useState, useRef, useEffect, useCallback, useTransition } from 'react'
import {
  createAdminUploadTicket,
  registerAdminUpload,
  adminDeleteFile,
  getAdminDownloadUrl,
  moveDocumentTo,
  adminCreateFolder,
  adminRenameFolder,
  adminDeleteFolder,
  type FileOpResult,
} from './actions'
import { triggerDownload } from '@/lib/download-file'
import { useDirectUpload } from '@/lib/use-direct-upload'
import { DocumentPreviewPanel } from '@/components/admin/DocumentPreviewPanel'
import { formatMb } from '@/lib/uploadLimits'

type DocRow = {
  id: string
  name: string
  file_url: string
  folder: string | null
  project_id: string | null
  created_at: string
}

type FolderRow = {
  id: string
  project_id: string | null
  path: string
}

type ClientProject = {
  id: string
  title: string
}

/**
 * Ebene, in der der Explorer gerade steht: eine Projekt-ID oder `null` für die
 * kundenweite Ebene ("Alle Projekte"). Dateien und Ordner dürfen in beiden liegen.
 */
type Scope = string | null

/** MIME-Typ für interne Datei-Drags — trennt sie von echten Datei-Drops aus dem OS. */
const DOC_MIME = 'application/x-schuck-document'

const ROOT_LABEL = 'Alle Projekte'

// ── Path helpers ──────────────────────────────────────────────────────────────

function parentOf(path: string): string | null {
  const idx = path.lastIndexOf('/')
  return idx === -1 ? null : path.slice(0, idx)
}

function nameOf(path: string): string {
  const idx = path.lastIndexOf('/')
  return idx === -1 ? path : path.slice(idx + 1)
}

function isAtOrUnder(candidate: string | null, root: string): boolean {
  return candidate === root || (candidate?.startsWith(root + '/') ?? false)
}

/** Direkte Unterordner eines Pfades. Jeder Zwischenpfad ist eine eigene folders-Zeile. */
function childFolderPaths(folders: FolderRow[], parent: string | null): string[] {
  return folders
    .filter((f) => parentOf(f.path) === parent)
    .map((f) => f.path)
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'de'))
}

function filesAtPath(documents: DocRow[], path: string | null): DocRow[] {
  return documents.filter((d) => (d.folder ?? null) === path)
}

function countUnderPath(documents: DocRow[], path: string): number {
  return documents.filter((d) => isAtOrUnder(d.folder, path)).length
}

// ── UI Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function fileExt(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function FileTypeIcon({ name }: { name: string }) {
  const ext = fileExt(name)
  const cfg =
    ext === 'pdf' ? { bg: 'bg-red-50', text: 'text-red-500' } :
    ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? { bg: 'bg-sky-50', text: 'text-sky-500' } :
    ext === 'svg' ? { bg: 'bg-violet-50', text: 'text-violet-500' } :
    ext === 'zip' ? { bg: 'bg-amber-50', text: 'text-amber-500' } :
    ['doc', 'docx'].includes(ext) ? { bg: 'bg-blue-50', text: 'text-blue-500' } :
    { bg: 'bg-gray-100', text: 'text-gray-400' }
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
      <span className={`text-[9px] font-bold leading-none uppercase ${cfg.text}`}>
        {ext || 'FILE'}
      </span>
    </div>
  )
}

function FolderSvg({ className = 'w-8 h-8 text-amber-400' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ── Folder Name Modal (anlegen + umbenennen) ──────────────────────────────────

function FolderNameModal({
  onClose,
  onConfirm,
  title,
  hint,
  initialValue = '',
  confirmLabel,
}: {
  onClose: () => void
  onConfirm: (name: string) => void
  title: string
  hint?: string
  initialValue?: string
  confirmLabel: string
}) {
  const [name, setName] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.select() }, [])

  const trimmed = name.trim()
  const invalid = trimmed.includes('/') || trimmed.includes('\\')

  function submit() {
    if (!trimmed || invalid) return
    onConfirm(trimmed)
  }

  return (
    <Modal onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        {hint && (
          <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>{hint}</p>
        )}
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100 transition-all">
          <FolderSvg className="w-4 h-4 text-amber-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            placeholder="Ordnername eingeben"
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder-gray-400 min-w-0"
          />
        </div>
        {invalid && (
          <p className="text-xs text-red-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Ordnernamen dürfen kein „/“ enthalten — Unterordner legst du innerhalb des Ordners an.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Abbrechen
          </button>
          <button
            onClick={submit}
            disabled={!trimmed || invalid}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Download Button (lazy) ────────────────────────────────────────────────────

function DownloadButton({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await triggerDownload(getAdminDownloadUrl, fileUrl, fileName)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="shrink-0 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )}
      {loading ? 'Lädt…' : 'Download'}
    </button>
  )
}

// ── Upload Form ───────────────────────────────────────────────────────────────

function UploadForm({
  projectId,
  clientId,
  initialFolder,
  preSelectedFile,
  onSuccess,
}: {
  projectId: Scope
  clientId: string
  initialFolder: string | null
  preSelectedFile?: File | null
  onSuccess?: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Startwert direkt aus der Prop: das Formular wird erst gemountet, wenn der Upload-Dialog
  // öffnet — die per Drag&Drop fallengelassene Datei steht zu dem Zeitpunkt schon fest.
  // (Ein useEffect wäre hier ein unnötiger zweiter Render.)
  const [file, setFile] = useState<File | null>(preSelectedFile ?? null)
  const [dragOver, setDragOver] = useState(false)

  const requestTicket = useCallback(
    (fileName: string) => createAdminUploadTicket(clientId, fileName),
    [clientId]
  )
  const register = useCallback(
    (path: string, fileName: string) => registerAdminUpload(path, fileName, clientId, projectId, initialFolder),
    [clientId, projectId, initialFolder]
  )

  const { upload, phase, pending, phaseLabel, error, notice, uploadedName } = useDirectUpload({
    requestTicket,
    register,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    const ok = await upload(file)
    if (ok) {
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onSuccess?.()
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label
        className={`flex items-center gap-3 w-full rounded-xl border-2 border-dashed px-4 py-4 cursor-pointer transition-colors ${
          dragOver
            ? 'border-gray-700 bg-gray-50'
            : file
            ? 'border-green-400 bg-green-50'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }}
        onDragLeave={(e) => { e.stopPropagation(); setDragOver(false) }}
        onDrop={handleDrop}
      >
        {file ? (
          <>
            <FileTypeIcon name={file.name} />
            <span className="flex-1 min-w-0 text-sm text-gray-800 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {file.name}
            </span>
            <span className="text-xs text-gray-400 shrink-0">{formatMb(file.size)} MB · Ändern</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Datei auswählen oder hierher ziehen
            </span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        Ziel: {projectId === null ? ROOT_LABEL : 'Projekt'}
        {initialFolder ? ` · ${initialFolder}` : ' · kein Ordner'}
      </p>

      {error && (
        <p className="text-xs text-red-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>{error}</p>
      )}
      {notice && (
        <p className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-dm-sans)' }}>{notice}</p>
      )}
      {uploadedName && (
        <p className="text-xs text-green-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          „{uploadedName}“ hochgeladen.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || !file}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {phase !== 'idle' ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {phaseLabel}
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Hochladen
            </>
          )}
        </button>
      </div>
    </form>
  )
}

// ── Verschieben-Ziele ─────────────────────────────────────────────────────────

type MoveTarget = { projectId: Scope; folder: string | null }

function encodeTarget(t: MoveTarget): string {
  return JSON.stringify(t)
}

function decodeTarget(raw: string): MoveTarget | null {
  try {
    const parsed = JSON.parse(raw) as MoveTarget
    return { projectId: parsed.projectId ?? null, folder: parsed.folder ?? null }
  } catch {
    return null
  }
}

/**
 * Auswahlfeld über ALLE Ebenen des Kunden — kundenweit und jedes Projekt, jeweils mit
 * Wurzel und allen Ordnern. Entscheidend gegenüber der alten Version: die Liste kommt aus
 * der folders-Tabelle, nicht aus den vorhandenen Dateien. Vorher tauchte ein Ordner nur
 * auf, wenn dort schon eine Datei lag — bei genau einer Datei stand deshalb ausschließlich
 * "Kein Ordner" zur Wahl und jedes Verschieben war ein No-Op.
 */
function MoveTargetSelect({
  folders,
  clientProjects,
  value,
  onChange,
}: {
  folders: FolderRow[]
  clientProjects: ClientProject[]
  value: MoveTarget
  onChange: (target: MoveTarget) => void
}) {
  const scopes: { id: Scope; label: string }[] = [
    { id: null, label: `${ROOT_LABEL} (kundenweit)` },
    ...clientProjects.map((p) => ({ id: p.id as Scope, label: p.title })),
  ]

  return (
    <select
      value={encodeTarget(value)}
      onChange={(e) => {
        const target = decodeTarget(e.target.value)
        if (target) onChange(target)
      }}
      className="text-xs rounded-lg border border-gray-200 bg-white px-2 py-1 outline-none focus:border-gray-400 max-w-50"
      style={{ fontFamily: 'var(--font-dm-sans)' }}
    >
      {scopes.map((scope) => {
        const scopeFolders = folders
          .filter((f) => (f.project_id ?? null) === scope.id)
          .map((f) => f.path)
          .sort((a, b) => a.localeCompare(b, 'de'))

        return (
          <optgroup key={scope.id ?? '__root__'} label={scope.label}>
            <option value={encodeTarget({ projectId: scope.id, folder: null })}>
              Kein Ordner
            </option>
            {scopeFolders.map((path) => (
              <option key={path} value={encodeTarget({ projectId: scope.id, folder: path })}>
                {path}
              </option>
            ))}
          </optgroup>
        )
      })}
    </select>
  )
}

// ── File List ─────────────────────────────────────────────────────────────────

function FileList({
  files,
  clientId,
  scope,
  folders,
  clientProjects,
  onPreview,
  onMove,
  onError,
  busy,
}: {
  files: DocRow[]
  clientId: string
  scope: Scope
  folders: FolderRow[]
  clientProjects: ClientProject[]
  onPreview: (doc: DocRow) => void
  onMove: (documentId: string, target: MoveTarget) => void
  onError: (message: string) => void
  busy: boolean
}) {
  const [movingId, setMovingId] = useState<string | null>(null)
  const [target, setTarget] = useState<MoveTarget>({ projectId: scope, folder: null })

  function startMove(doc: DocRow) {
    setTarget({ projectId: doc.project_id ?? null, folder: doc.folder ?? null })
    setMovingId(doc.id)
  }

  return (
    <div className="divide-y divide-gray-100 pb-2">
      {files.map((doc) => (
        <div
          key={doc.id}
          draggable={!busy}
          onDragStart={(e) => {
            e.dataTransfer.setData(DOC_MIME, doc.id)
            e.dataTransfer.setData('text/plain', doc.name)
            e.dataTransfer.effectAllowed = 'move'
          }}
          className={`px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors group ${
            busy ? '' : 'cursor-grab active:cursor-grabbing'
          }`}
        >
          <button
            onClick={() => onPreview(doc)}
            className="flex-1 min-w-0 flex items-center gap-3 text-left"
          >
            <FileTypeIcon name={doc.name} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {doc.name}
              </p>
              <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {formatDate(doc.created_at)}
                {doc.folder && <span className="ml-1 text-gray-300">· {doc.folder}</span>}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-1.5 shrink-0">
            {movingId === doc.id ? (
              <div className="flex items-center gap-1.5">
                <MoveTargetSelect
                  folders={folders}
                  clientProjects={clientProjects}
                  value={target}
                  onChange={setTarget}
                />
                <button
                  type="button"
                  onClick={() => { setMovingId(null); onMove(doc.id, target) }}
                  className="text-xs px-2 py-1 bg-gray-900 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setMovingId(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <DownloadButton fileUrl={doc.file_url} fileName={doc.name} />
                <button
                  onClick={() => startMove(doc)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-blue-500 transition-all p-1"
                  title="Datei verschieben (oder auf einen Ordner ziehen)"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
                <form
                  action={async (formData: FormData) => {
                    const result = await adminDeleteFile(formData)
                    if (result.status === 'error') onError(result.message)
                  }}
                >
                  <input type="hidden" name="file_url" value={doc.file_url} />
                  <input type="hidden" name="document_id" value={doc.id} />
                  <input type="hidden" name="client_id" value={clientId} />
                  <button
                    type="submit"
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
                    title="Datei löschen"
                    onClick={(e) => {
                      if (!confirm(`"${doc.name}" wirklich löschen?`)) e.preventDefault()
                    }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Drop-Ziel-Kachel ──────────────────────────────────────────────────────────

/**
 * Gemeinsame Basis für Ordner- und Projektkacheln: nimmt gezogene Dateien entgegen.
 * `types.includes(DOC_MIME)` statt `getData()` — während `dragover` liefert der Browser
 * aus Datenschutzgründen keinen Inhalt, nur die Typenliste.
 */
function DropTile({
  onDropDocument,
  onClick,
  children,
  className = '',
}: {
  onDropDocument: (documentId: string) => void
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  const [over, setOver] = useState(false)

  return (
    <button
      onClick={onClick}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DOC_MIME)) return
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes(DOC_MIME)) return
        e.preventDefault()
        e.stopPropagation()
        setOver(false)
        const id = e.dataTransfer.getData(DOC_MIME)
        if (id) onDropDocument(id)
      }}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors text-left ${
        over ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100' : className
      }`}
    >
      {children}
    </button>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminFileExplorer({
  projectId,
  clientId,
  clientDocuments,
  folders,
  clientProjects,
}: {
  /** Projekt der aufrufenden Seite — Startebene des Explorers. */
  projectId: string
  clientId: string
  /** ALLE Dokumente des Kunden, inklusive der ohne Projektzuordnung. */
  clientDocuments: DocRow[]
  folders: FolderRow[]
  clientProjects: ClientProject[]
}) {
  const [scope, setScope] = useState<Scope>(projectId)
  const [path, setPath] = useState<string | null>(null)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [globalDragOver, setGlobalDragOver] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<DocRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const dragCounter = useRef(0)

  const isRoot = scope === null && path === null
  const activeProject = clientProjects.find((p) => p.id === scope) ?? null

  const scopeDocuments = clientDocuments.filter((d) => (d.project_id ?? null) === scope)
  const scopeFolders = folders.filter((f) => (f.project_id ?? null) === scope)

  const childPaths = childFolderPaths(scopeFolders, path)
  const viewFiles = filesAtPath(scopeDocuments, path)

  /** Führt eine Server Action aus und hebt ihre Fehlermeldung in das Banner. */
  function run(action: () => Promise<FileOpResult>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.status === 'error') setError(result.message)
    })
  }

  function moveTo(documentId: string, target: MoveTarget) {
    run(() => moveDocumentTo(documentId, target.projectId, target.folder))
  }

  function goBack() {
    if (path !== null) {
      setPath(parentOf(path))
    } else if (scope !== null) {
      setScope(null)
    }
  }

  function enterProject(id: string) {
    setScope(id)
    setPath(null)
  }

  function closeUploadModal() {
    setShowUploadModal(false)
    setDroppedFile(null)
  }

  // ── Globales Drag & Drop: nur für echte Dateien aus dem OS ──
  // Interne Datei-Drags tragen DOC_MIME und werden von den Kacheln behandelt; ohne diese
  // Unterscheidung würde das Verschieben innerhalb des Explorers den Upload-Dialog öffnen.
  function isFileDrag(e: React.DragEvent) {
    return e.dataTransfer.types.includes('Files')
  }

  function handleGlobalDragEnter(e: React.DragEvent) {
    if (!isFileDrag(e)) return
    e.preventDefault()
    dragCounter.current++
    setGlobalDragOver(true)
  }

  function handleGlobalDragOver(e: React.DragEvent) {
    if (!isFileDrag(e)) return
    e.preventDefault()
  }

  function handleGlobalDragLeave() {
    dragCounter.current--
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setGlobalDragOver(false)
    }
  }

  function handleGlobalDrop(e: React.DragEvent) {
    if (!isFileDrag(e)) return
    e.preventDefault()
    dragCounter.current = 0
    setGlobalDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    setDroppedFile(file)
    setShowUploadModal(true)
  }

  const breadcrumbSegments = path ? path.split('/') : []

  return (
    <>
      {/* ── Modals ── */}
      {showNewFolderModal && (
        <FolderNameModal
          title={path ? `Unterordner in „${nameOf(path)}“` : 'Neuer Ordner'}
          hint={
            path
              ? `Pfad: ${path}/`
              : `Ebene: ${activeProject ? activeProject.title : `${ROOT_LABEL} (kundenweit)`}`
          }
          confirmLabel="Erstellen"
          onClose={() => setShowNewFolderModal(false)}
          onConfirm={(name) => {
            setShowNewFolderModal(false)
            run(() => adminCreateFolder(clientId, scope, path, name))
          }}
        />
      )}

      {renamingFolder && (
        <FolderNameModal
          title="Ordner umbenennen"
          hint={`Unterordner und enthaltene Dateien wandern mit.`}
          initialValue={nameOf(renamingFolder)}
          confirmLabel="Umbenennen"
          onClose={() => setRenamingFolder(null)}
          onConfirm={(name) => {
            const target = renamingFolder
            setRenamingFolder(null)
            // Steht der Explorer im umbenannten Ordner, muss der Pfad mitwandern —
            // sonst zeigt die Ansicht auf einen Pfad, den es nicht mehr gibt.
            if (path && isAtOrUnder(path, target)) {
              const parent = parentOf(target)
              const newTarget = parent ? `${parent}/${name}` : name
              setPath(newTarget + path.slice(target.length))
            }
            run(() => adminRenameFolder(clientId, scope, target, name))
          }}
        />
      )}

      {showUploadModal && (
        <Modal onClose={closeUploadModal} title="Datei hochladen">
          <UploadForm
            projectId={scope}
            clientId={clientId}
            initialFolder={path}
            preSelectedFile={droppedFile}
            onSuccess={closeUploadModal}
          />
        </Modal>
      )}

      {/* ── Explorer Card ── */}
      <div
        className="rounded-2xl border border-gray-200 bg-white overflow-hidden relative"
        onDragEnter={handleGlobalDragEnter}
        onDragOver={handleGlobalDragOver}
        onDragLeave={handleGlobalDragLeave}
        onDrop={handleGlobalDrop}
      >
        {globalDragOver && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-400 bg-white/95 pointer-events-none">
            <svg className="w-9 h-9 text-gray-400 mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm font-medium text-gray-600">Datei loslassen zum Hochladen</p>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
          <button
            onClick={goBack}
            disabled={isRoot}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-0 disabled:pointer-events-none transition-colors"
            aria-label="Zurück"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Breadcrumbs — jede Stufe ist zugleich Drop-Ziel */}
          <nav className="flex items-center gap-1 text-sm flex-1 min-w-0 overflow-hidden">
            <BreadcrumbCrumb
              label={ROOT_LABEL}
              active={isRoot}
              onClick={() => { setScope(null); setPath(null) }}
              onDropDocument={(id) => moveTo(id, { projectId: null, folder: null })}
            />

            {activeProject && (
              <span className="flex items-center gap-1 min-w-0">
                <CrumbArrow />
                <BreadcrumbCrumb
                  label={activeProject.title}
                  active={path === null}
                  onClick={() => setPath(null)}
                  onDropDocument={(id) => moveTo(id, { projectId: activeProject.id, folder: null })}
                />
              </span>
            )}

            {breadcrumbSegments.map((seg, i) => {
              const segPath = breadcrumbSegments.slice(0, i + 1).join('/')
              const isLast = i === breadcrumbSegments.length - 1
              return (
                <span key={segPath} className="flex items-center gap-1 min-w-0">
                  <CrumbArrow />
                  <BreadcrumbCrumb
                    label={seg}
                    active={isLast}
                    onClick={() => setPath(segPath)}
                    onDropDocument={(id) => moveTo(id, { projectId: scope, folder: segPath })}
                  />
                </span>
              )
            })}
          </nav>

          <span className="text-xs text-gray-400 shrink-0" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {pending ? 'Speichert…' : `${scopeDocuments.length} ${scopeDocuments.length === 1 ? 'Datei' : 'Dateien'}`}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
              <span className="hidden sm:inline">Neuer Ordner</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Hochladen
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex items-start gap-2">
            <p className="text-xs text-red-600 flex-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ══ Projekte — nur auf der kundenweiten Wurzel ══ */}
        {isRoot && (
          <div className="px-4 pt-4 pb-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Projekte
            </p>
            {clientProjects.length === 0 ? (
              <p className="text-sm text-gray-400 py-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Keine Projekte vorhanden.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {clientProjects.map((proj) => {
                  const count = clientDocuments.filter((d) => d.project_id === proj.id).length
                  return (
                    <DropTile
                      key={proj.id}
                      onClick={() => enterProject(proj.id)}
                      onDropDocument={(id) => moveTo(id, { projectId: proj.id, folder: null })}
                      className="border-gray-100 bg-gray-50 hover:bg-amber-50 hover:border-amber-200"
                    >
                      <FolderSvg className="w-5 h-5 text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>{proj.title}</p>
                        <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>{count} {count === 1 ? 'Datei' : 'Dateien'}</p>
                      </div>
                    </DropTile>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ Ordner der aktuellen Ebene ══ */}
        {childPaths.length > 0 && (
          <div className="px-4 pt-4 pb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Ordner
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {childPaths.map((fullPath) => {
                const count = countUnderPath(scopeDocuments, fullPath)
                return (
                  <div key={fullPath} className="relative group">
                    <DropTile
                      onClick={() => setPath(fullPath)}
                      onDropDocument={(id) => moveTo(id, { projectId: scope, folder: fullPath })}
                      className="border-gray-100 bg-gray-50 hover:bg-amber-50 hover:border-amber-200 w-full"
                    >
                      <FolderSvg className="w-5 h-5 text-amber-400 shrink-0" />
                      <div className="min-w-0 pr-10">
                        <p className="text-sm font-medium text-gray-800 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {nameOf(fullPath)}
                        </p>
                        <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                          {count} {count === 1 ? 'Datei' : 'Dateien'}
                        </p>
                      </div>
                    </DropTile>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setRenamingFolder(fullPath)}
                        title="Ordner umbenennen"
                        className="p-1 rounded-md text-gray-400 hover:text-gray-800 hover:bg-white transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          const msg = count > 0
                            ? `Ordner „${nameOf(fullPath)}“ löschen?\n\n${count} ${count === 1 ? 'Datei wird' : 'Dateien werden'} nach „${parentOf(fullPath) ?? (activeProject ? activeProject.title : ROOT_LABEL)}“ verschoben — es geht nichts verloren.`
                            : `Ordner „${nameOf(fullPath)}“ löschen?`
                          if (confirm(msg)) run(() => adminDeleteFolder(clientId, scope, fullPath))
                        }}
                        title="Ordner löschen"
                        className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-white transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══ Dateien der aktuellen Ebene ══ */}
        {viewFiles.length > 0 && (
          <>
            {(childPaths.length > 0 || isRoot) && <div className="mx-4 border-t border-gray-100" />}
            <div className="px-4 pt-4 pb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {path === null ? 'Dateien ohne Ordner' : `Dateien (${viewFiles.length})`}
              </p>
            </div>
            <FileList
              files={viewFiles}
              clientId={clientId}
              scope={scope}
              folders={folders}
              clientProjects={clientProjects}
              onPreview={setPreviewDoc}
              onMove={moveTo}
              onError={setError}
              busy={pending}
            />
          </>
        )}

        {childPaths.length === 0 && viewFiles.length === 0 && !isRoot && (
          <div className="px-4 py-10 text-center">
            <svg className="w-8 h-8 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>Noch keine Inhalte.</p>
            <p className="text-xs text-gray-300 mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>Nutze „Hochladen“ oder „Neuer Ordner“ oben.</p>
          </div>
        )}

        {isRoot && childPaths.length === 0 && viewFiles.length === 0 && (
          <div className="px-4 pb-5 pt-2">
            <p className="text-xs text-gray-300" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Hier liegen kundenweite Dateien ohne Projektbezug — „Hochladen“ legt sie direkt auf dieser Ebene ab.
            </p>
          </div>
        )}
      </div>

      {previewDoc && (
        <DocumentPreviewPanel
          fileName={previewDoc.name}
          fileUrl={previewDoc.file_url}
          getSignedUrl={getAdminDownloadUrl}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </>
  )
}

// ── Breadcrumb-Teile ──────────────────────────────────────────────────────────

function CrumbArrow() {
  return (
    <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function BreadcrumbCrumb({
  label,
  active,
  onClick,
  onDropDocument,
}: {
  label: string
  active: boolean
  onClick: () => void
  onDropDocument: (documentId: string) => void
}) {
  const [over, setOver] = useState(false)

  return (
    <button
      onClick={onClick}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DOC_MIME)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes(DOC_MIME)) return
        e.preventDefault()
        setOver(false)
        const id = e.dataTransfer.getData(DOC_MIME)
        if (id) onDropDocument(id)
      }}
      className={`shrink-0 truncate px-1 rounded transition-colors ${
        over
          ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
          : active
          ? 'text-gray-900 font-medium'
          : 'text-gray-400 hover:text-gray-700'
      }`}
      style={{ fontFamily: 'var(--font-dm-sans)' }}
    >
      {label}
    </button>
  )
}
