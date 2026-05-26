'use client'

import { useActionState, useState, useRef, useEffect } from 'react'
import { adminUploadFile, adminDeleteFile, getAdminDownloadUrl, moveDocument } from './actions'

type DocRow = {
  id: string
  name: string
  file_url: string
  folder: string | null
  created_at: string
}

type ClientProject = {
  id: string
  title: string
  documents: DocRow[]
}

// folder is a full path, e.g. "Verträge" or "Verträge/2024"
type View =
  | { type: 'root' }
  | { type: 'project' }
  | { type: 'folder'; folder: string }

type UploadState =
  | { status: 'success'; fileName: string }
  | { status: 'error'; message: string }
  | null

// ── Path helpers ──────────────────────────────────────────────────────────────

function getChildFolderNames(documents: DocRow[], parentPath: string | null): string[] {
  const seen = new Set<string>()
  for (const doc of documents) {
    if (!doc.folder) continue
    if (parentPath === null) {
      seen.add(doc.folder.split('/')[0])
    } else {
      const prefix = parentPath + '/'
      if (doc.folder.startsWith(prefix)) {
        const segment = doc.folder.slice(prefix.length).split('/')[0]
        if (segment) seen.add(segment)
      }
    }
  }
  return [...seen].sort()
}

function getFilesAtPath(documents: DocRow[], path: string | null): DocRow[] {
  if (path === null) return documents.filter((d) => !d.folder)
  return documents.filter((d) => d.folder === path)
}

function countUnderPath(documents: DocRow[], path: string): number {
  return documents.filter((d) => d.folder === path || d.folder?.startsWith(path + '/')).length
}

function getAllFolderPaths(documents: DocRow[]): string[] {
  return [...new Set(documents.map((d) => d.folder).filter(Boolean) as string[])].sort()
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
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
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

// ── New Folder Modal ──────────────────────────────────────────────────────────

function NewFolderModal({
  onClose,
  onConfirm,
  parentPath,
}: {
  onClose: () => void
  onConfirm: (name: string) => void
  parentPath: string | null
}) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    onConfirm(trimmed)
  }

  const title = parentPath
    ? `Unterordner in „${parentPath.split('/').pop()}"`
    : 'Neuer Ordner'

  return (
    <Modal onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        {parentPath && (
          <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Pfad: <span className="font-medium text-gray-600">{parentPath}/</span>
          </p>
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
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Abbrechen
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Erstellen
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
      const url = await getAdminDownloadUrl(fileUrl)
      if (!url) return
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
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
  projectId: string
  clientId: string
  initialFolder: string | null
  preSelectedFile?: File | null
  onSuccess?: () => void
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const [uploadState, uploadAction, uploadPending] = useActionState<UploadState, FormData>(
    adminUploadFile,
    null
  )

  useEffect(() => {
    if (!preSelectedFile || !fileInputRef.current) return
    const dt = new DataTransfer()
    dt.items.add(preSelectedFile)
    fileInputRef.current.files = dt.files
    setSelectedFile(preSelectedFile.name)
  }, [preSelectedFile])

  useEffect(() => {
    if (uploadState?.status === 'success') {
      setSelectedFile(null)
      formRef.current?.reset()
      onSuccess?.()
    }
  }, [uploadState, onSuccess])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file || !fileInputRef.current) return
    const dt = new DataTransfer()
    dt.items.add(file)
    fileInputRef.current.files = dt.files
    setSelectedFile(file.name)
  }

  return (
    <form ref={formRef} action={uploadAction} className="flex flex-col gap-3">
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="folder" value={initialFolder ?? ''} />

      {/* File drop zone */}
      <label
        className={`flex items-center gap-3 w-full rounded-xl border-2 border-dashed px-4 py-4 cursor-pointer transition-colors ${
          dragOver
            ? 'border-gray-700 bg-gray-50'
            : selectedFile
            ? 'border-green-400 bg-green-50'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }}
        onDragLeave={(e) => { e.stopPropagation(); setDragOver(false) }}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <>
            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-green-700 truncate flex-1">{selectedFile}</span>
            <span className="text-xs text-gray-400 shrink-0">Ändern</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>Datei wählen oder hierher ziehen</p>
              <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>PDF, Bilder, ZIP, Word · max. 10 MB</p>
            </div>
          </>
        )}
        <input
          ref={fileInputRef}
          name="file"
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.svg,.zip,.txt,.doc,.docx"
          onChange={(e) => setSelectedFile(e.target.files?.[0]?.name ?? null)}
        />
      </label>

      {uploadState?.status === 'error' && (
        <p className="text-xs text-red-600">{uploadState.message}</p>
      )}
      {uploadState?.status === 'success' && (
        <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          {uploadState.fileName} hochgeladen
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={uploadPending || !selectedFile}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {uploadPending ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Lädt hoch…
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

// ── File List ─────────────────────────────────────────────────────────────────

function FileList({
  files,
  projectId,
  allFolderPaths,
}: {
  files: DocRow[]
  projectId: string
  allFolderPaths: string[]
}) {
  const [movingId, setMovingId] = useState<string | null>(null)

  return (
    <div className="divide-y divide-gray-50 pb-2">
      {files.map((doc) => (
        <div key={doc.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors group">
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
          <div className="flex items-center gap-1.5 shrink-0">
            {movingId === doc.id ? (
              <form
                action={moveDocument}
                onSubmit={() => setMovingId(null)}
                className="flex items-center gap-1.5"
              >
                <input type="hidden" name="document_id" value={doc.id} />
                <input type="hidden" name="project_id" value={projectId} />
                <select
                  name="target_folder"
                  defaultValue={doc.folder ?? ''}
                  className="text-xs rounded-lg border border-gray-200 bg-white px-2 py-1 outline-none focus:border-gray-400"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  <option value="">Kein Ordner</option>
                  {allFolderPaths.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <button
                  type="submit"
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
              </form>
            ) : (
              <>
                <DownloadButton fileUrl={doc.file_url} fileName={doc.name} />
                <button
                  onClick={() => setMovingId(doc.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-blue-500 transition-all p-1"
                  title="Datei verschieben"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
                <form action={adminDeleteFile}>
                  <input type="hidden" name="file_url" value={doc.file_url} />
                  <input type="hidden" name="document_id" value={doc.id} />
                  <input type="hidden" name="project_id" value={projectId} />
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

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminFileExplorer({
  projectId,
  clientId,
  documents,
  clientProjects,
}: {
  projectId: string
  clientId: string
  documents: DocRow[]
  clientProjects: ClientProject[]
}) {
  const [view, setView] = useState<View>({ type: 'project' })
  const [activeProjectId, setActiveProjectId] = useState(projectId)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [pendingNewFolderPath, setPendingNewFolderPath] = useState<string | null>(null)
  const [globalDragOver, setGlobalDragOver] = useState(false)
  const dragCounter = useRef(0)

  const isRoot = view.type === 'root'
  const isProject = view.type === 'project'
  const currentPath = view.type === 'folder' ? view.folder : null

  const activeClientProject = clientProjects.find((p) => p.id === activeProjectId)
  const activeDocuments = activeClientProject ? activeClientProject.documents : documents
  const activeProjectTitle = activeClientProject?.title ?? ''

  const childFolderNames = getChildFolderNames(activeDocuments, currentPath)
  const viewFiles = getFilesAtPath(activeDocuments, currentPath)
  const allFolderPaths = getAllFolderPaths(activeDocuments)

  function enterFolder(name: string) {
    const fullPath = currentPath ? currentPath + '/' + name : name
    setView({ type: 'folder', folder: fullPath })
  }

  function goBack() {
    if (view.type === 'folder') {
      const parts = view.folder.split('/')
      if (parts.length > 1) {
        setView({ type: 'folder', folder: parts.slice(0, -1).join('/') })
      } else {
        setView({ type: 'project' })
      }
    } else if (view.type === 'project') {
      setView({ type: 'root' })
    }
  }

  function enterProject(proj: ClientProject) {
    setActiveProjectId(proj.id)
    setView({ type: 'project' })
  }

  function closeUploadModal() {
    setShowUploadModal(false)
    setDroppedFile(null)
    setPendingNewFolderPath(null)
  }

  function handleUploadSuccess() {
    if (pendingNewFolderPath) {
      setView({ type: 'folder', folder: pendingNewFolderPath })
    }
    closeUploadModal()
  }

  // ── Global drag-and-drop ──
  function handleGlobalDragEnter(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current++
    setGlobalDragOver(true)
  }

  function handleGlobalDragOver(e: React.DragEvent) {
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
    e.preventDefault()
    dragCounter.current = 0
    setGlobalDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    setDroppedFile(file)
    setShowUploadModal(true)
  }

  return (
    <>
      {/* ── Modals ── */}
      {showNewFolderModal && (
        <NewFolderModal
          parentPath={currentPath}
          onClose={() => setShowNewFolderModal(false)}
          onConfirm={(name) => {
            const fullPath = currentPath ? currentPath + '/' + name : name
            setShowNewFolderModal(false)
            setPendingNewFolderPath(fullPath)
            setShowUploadModal(true)
          }}
        />
      )}

      {showUploadModal && (
        <Modal
          onClose={closeUploadModal}
          title={pendingNewFolderPath ? `Ordner „${pendingNewFolderPath.split('/').pop()}" erstellen` : 'Datei hochladen'}
        >
          {pendingNewFolderPath && (
            <p className="text-xs text-gray-400 mb-4 -mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Lade eine Datei hoch, um den Ordner zu speichern.
            </p>
          )}
          <UploadForm
            projectId={activeProjectId}
            clientId={clientId}
            initialFolder={pendingNewFolderPath ?? currentPath}
            preSelectedFile={droppedFile}
            onSuccess={handleUploadSuccess}
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
        {/* Global drag-and-drop overlay */}
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

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-sm flex-1 min-w-0 overflow-hidden">
            <button
              onClick={() => setView({ type: 'root' })}
              className={`shrink-0 transition-colors ${isRoot ? 'text-gray-900 font-medium' : 'text-gray-400 hover:text-gray-700'}`}
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Alle Projekte
            </button>

            {!isRoot && (
              <span className="flex items-center gap-1 min-w-0">
                <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <button
                  onClick={() => setView({ type: 'project' })}
                  className={`shrink-0 truncate transition-colors ${isProject ? 'text-gray-900 font-medium' : 'text-gray-400 hover:text-gray-700'}`}
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  {activeProjectTitle}
                </button>
              </span>
            )}

            {view.type === 'folder' && (() => {
              const segments = view.folder.split('/')
              return segments.map((seg, i) => {
                const segPath = segments.slice(0, i + 1).join('/')
                const isLast = i === segments.length - 1
                return (
                  <span key={segPath} className="flex items-center gap-1 min-w-0">
                    <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    {isLast ? (
                      <span className="text-gray-900 font-medium truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>{seg}</span>
                    ) : (
                      <button
                        onClick={() => setView({ type: 'folder', folder: segPath })}
                        className="text-gray-400 hover:text-gray-700 truncate transition-colors"
                        style={{ fontFamily: 'var(--font-dm-sans)' }}
                      >
                        {seg}
                      </button>
                    )}
                  </span>
                )
              })
            })()}
          </nav>

          <span className="text-xs text-gray-400 shrink-0" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {isRoot
              ? `${clientProjects.length} ${clientProjects.length === 1 ? 'Projekt' : 'Projekte'}`
              : `${activeDocuments.length} ${activeDocuments.length === 1 ? 'Datei' : 'Dateien'}`}
          </span>

          {/* Action buttons — hidden in root view */}
          {!isRoot && (
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
          )}
        </div>

        {/* ══ Root view: all client projects ══ */}
        {isRoot && (
          <div className="px-4 pt-4 pb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Projekte
            </p>
            {clientProjects.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Keine Projekte vorhanden.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {clientProjects.map((proj) => {
                  const count = proj.documents.length
                  const isActive = proj.id === activeProjectId
                  return (
                    <button
                      key={proj.id}
                      onClick={() => enterProject(proj)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors text-left ${
                        isActive
                          ? 'border-gray-300 bg-gray-100'
                          : 'border-gray-100 bg-gray-50 hover:bg-amber-50 hover:border-amber-200'
                      }`}
                    >
                      <FolderSvg className="w-5 h-5 text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>{proj.title}</p>
                        <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>{count} {count === 1 ? 'Datei' : 'Dateien'}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ Folder grid (sub-folders) + files ══ */}
        {!isRoot && (
          <div>
            {childFolderNames.length > 0 && (
              <div className="px-4 pt-4 pb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Ordner
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {childFolderNames.map((name) => {
                    const fullPath = currentPath ? currentPath + '/' + name : name
                    const count = countUnderPath(activeDocuments, fullPath)
                    return (
                      <button
                        key={name}
                        onClick={() => enterFolder(name)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-amber-50 hover:border-amber-200 transition-colors text-left"
                      >
                        <FolderSvg className="w-5 h-5 text-amber-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>{name}</p>
                          <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>{count} {count === 1 ? 'Datei' : 'Dateien'}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {viewFiles.length > 0 && (
              <>
                {childFolderNames.length > 0 && <div className="mx-4 border-t border-gray-100" />}
                {childFolderNames.length === 0 && isProject && <div className="px-4 pt-4" />}
                {childFolderNames.length > 0 && (
                  <div className="px-4 pt-4 pb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      {isProject ? 'Dateien ohne Ordner' : 'Dateien'}
                    </p>
                  </div>
                )}
                {childFolderNames.length === 0 && !isProject && (
                  <div className="px-4 pt-4 pb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      Dateien ({viewFiles.length})
                    </p>
                  </div>
                )}
                <FileList files={viewFiles} projectId={activeProjectId} allFolderPaths={allFolderPaths} />
              </>
            )}

            {childFolderNames.length === 0 && viewFiles.length === 0 && (
              <div className="px-4 py-10 text-center">
                <svg className="w-8 h-8 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>Noch keine Inhalte.</p>
                <p className="text-xs text-gray-300 mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>Nutze „Hochladen" oder „Neuer Ordner" oben.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
