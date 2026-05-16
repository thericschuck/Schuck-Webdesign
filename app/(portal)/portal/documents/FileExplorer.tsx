'use client'

import { useActionState, useState, useRef, useEffect } from 'react'
import { uploadFile } from '../upload/actions'
import { getDownloadUrl } from './actions'

const STATUS_LABEL: Record<string, string> = {
  briefing: 'Briefing',
  design: 'Design',
  development: 'Entwicklung',
  review: 'Review',
  live: 'Live',
}

type DocRow = {
  id: string
  name: string
  file_url: string
  folder: string | null
  created_at: string
}

type ProjectData = {
  id: string
  title: string
  status: string
  documents: DocRow[]
}

// folder is a full path, e.g. "Designs" or "Designs/V2"
type View =
  | { type: 'root' }
  | { type: 'project'; id: string; title: string; status: string }
  | { type: 'folder'; projectId: string; projectTitle: string; projectStatus: string; folder: string }

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
          <p className="text-xs text-gray-400">
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
      const url = await getDownloadUrl(fileUrl)
      if (url) {
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
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
  initialFolder,
  availableFolders,
  preSelectedFile,
  onSuccess,
}: {
  projectId: string
  initialFolder: string | null
  availableFolders: string[]
  preSelectedFile?: File | null
  onSuccess?: () => void
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [folderValue, setFolderValue] = useState(initialFolder ?? '')
  const [showNewInput, setShowNewInput] = useState(false)
  const [newFolderInput, setNewFolderInput] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const effectiveFolder = showNewInput ? newFolderInput.trim() : folderValue

  const [uploadState, uploadAction, uploadPending] = useActionState<UploadState, FormData>(
    uploadFile,
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
      setFolderValue(initialFolder ?? '')
      setShowNewInput(false)
      setNewFolderInput('')
      onSuccess?.()
    }
  }, [uploadState, initialFolder, onSuccess])

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
      <input type="hidden" name="folder" value={effectiveFolder} />

      {/* Folder selector */}
      <div className="flex items-center gap-2">
        <FolderSvg className="w-4 h-4 text-gray-300 shrink-0" />
        <select
          value={showNewInput ? '__new__' : folderValue}
          onChange={(e) => {
            if (e.target.value === '__new__') {
              setShowNewInput(true)
            } else {
              setShowNewInput(false)
              setFolderValue(e.target.value)
            }
          }}
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 min-w-0"
        >
          <option value="">Kein Ordner</option>
          {availableFolders.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
          <option value="__new__">+ Neuer Ordner…</option>
        </select>
      </div>

      {showNewInput && (
        <input
          type="text"
          value={newFolderInput}
          onChange={(e) => setNewFolderInput(e.target.value)}
          placeholder="Ordnername (z.B. Designs/V2)"
          autoFocus
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
        />
      )}

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
              <p className="text-sm text-gray-600">Datei wählen oder hierher ziehen</p>
              <p className="text-xs text-gray-400 mt-0.5">PDF, Bilder, ZIP, Word · max. 10 MB</p>
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

function FileList({ files }: { files: DocRow[] }) {
  return (
    <div className="divide-y divide-gray-50 pb-2">
      {files.map((doc) => (
        <div key={doc.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
          <FileTypeIcon name={doc.name} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
            <p className="text-xs text-gray-400">{formatDate(doc.created_at)}</p>
          </div>
          <DownloadButton fileUrl={doc.file_url} fileName={doc.name} />
        </div>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function FileExplorer({ projects }: { projects: ProjectData[] }) {
  const [view, setView] = useState<View>({ type: 'root' })
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [globalDragOver, setGlobalDragOver] = useState(false)
  const dragCounter = useRef(0)

  const currentProject =
    view.type === 'project'
      ? projects.find((p) => p.id === view.id) ?? null
      : view.type === 'folder'
      ? projects.find((p) => p.id === view.projectId) ?? null
      : null

  const canUpload = view.type === 'project' || view.type === 'folder'
  const canCreateFolder = view.type === 'project' || view.type === 'folder'
  const isRoot = view.type === 'root'

  const currentPath = view.type === 'folder' ? view.folder : null

  const projectDocs = currentProject?.documents ?? []
  const childFolderNames = view.type === 'project'
    ? getChildFolderNames(projectDocs, null)
    : view.type === 'folder'
    ? getChildFolderNames(projectDocs, view.folder)
    : []
  const viewFiles = view.type === 'project'
    ? getFilesAtPath(projectDocs, null)
    : view.type === 'folder'
    ? getFilesAtPath(projectDocs, view.folder)
    : []
  const allFolderPaths = currentProject ? getAllFolderPaths(currentProject.documents) : []

  const uploadProjectId =
    view.type === 'project' ? view.id :
    view.type === 'folder' ? view.projectId : ''

  function goBack() {
    if (view.type === 'folder') {
      const parts = view.folder.split('/')
      if (parts.length > 1) {
        setView({ ...view, folder: parts.slice(0, -1).join('/') })
      } else {
        setView({ type: 'project', id: view.projectId, title: view.projectTitle, status: view.projectStatus })
      }
    } else if (view.type === 'project') {
      setView({ type: 'root' })
    }
  }

  function enterFolder(folderName: string) {
    const projectId = view.type === 'project' ? view.id : view.type === 'folder' ? view.projectId : ''
    const projectTitle = view.type === 'project' ? view.title : view.type === 'folder' ? view.projectTitle : ''
    const projectStatus = view.type === 'project' ? view.status : view.type === 'folder' ? view.projectStatus : ''
    const fullPath = currentPath ? currentPath + '/' + folderName : folderName
    setView({ type: 'folder', projectId, projectTitle, projectStatus, folder: fullPath })
  }

  function closeUploadModal() {
    setShowUploadModal(false)
    setDroppedFile(null)
  }

  // ── Global drag-and-drop ──
  function handleGlobalDragEnter(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current++
    if (canUpload) setGlobalDragOver(true)
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
    if (!canUpload) return
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
            setShowNewFolderModal(false)
            enterFolder(name)
          }}
        />
      )}

      {showUploadModal && canUpload && (
        <Modal onClose={closeUploadModal} title="Datei hochladen">
          <UploadForm
            projectId={uploadProjectId}
            initialFolder={currentPath}
            availableFolders={allFolderPaths}
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
        {/* Global drag-and-drop overlay */}
        {globalDragOver && canUpload && (
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
            >
              Dokumente
            </button>

            {(view.type === 'project' || view.type === 'folder') && (
              <>
                <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <button
                  onClick={() => {
                    if (view.type === 'folder') {
                      setView({ type: 'project', id: view.projectId, title: view.projectTitle, status: view.projectStatus })
                    }
                  }}
                  className={`truncate transition-colors ${view.type === 'project' ? 'text-gray-900 font-medium' : 'text-gray-400 hover:text-gray-700'}`}
                >
                  {view.type === 'project' ? view.title : view.projectTitle}
                </button>
              </>
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
                      <span className="text-gray-900 font-medium truncate">{seg}</span>
                    ) : (
                      <button
                        onClick={() => setView({ ...view, folder: segPath })}
                        className="text-gray-400 hover:text-gray-700 truncate transition-colors"
                      >
                        {seg}
                      </button>
                    )}
                  </span>
                )
              })
            })()}
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {canCreateFolder && (
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                <span className="hidden sm:inline">Neuer Ordner</span>
              </button>
            )}
            {canUpload && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Hochladen
              </button>
            )}
          </div>
        </div>

        {/* ══ ROOT: Projekte-Liste ══ */}
        {view.type === 'root' && (
          <>
            {projects.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                <p className="text-sm text-gray-400">Noch keine Projekte oder Dokumente vorhanden.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setView({ type: 'project', id: p.id, title: p.title, status: p.status })}
                    className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors group text-left"
                  >
                    <FolderSvg className="w-7 h-7 text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                      <p className="text-xs text-gray-400">
                        {p.documents.length} {p.documents.length === 1 ? 'Datei' : 'Dateien'}
                        {p.status ? ` · ${STATUS_LABEL[p.status] ?? p.status}` : ''}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ PROJECT / FOLDER LEVEL ══ */}
        {(view.type === 'project' || view.type === 'folder') && (
          <div>
            {childFolderNames.length > 0 && (
              <div className="px-4 pt-4 pb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ordner</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {childFolderNames.map((name) => {
                    const fullPath = currentPath ? currentPath + '/' + name : name
                    const count = countUnderPath(projectDocs, fullPath)
                    return (
                      <button
                        key={name}
                        onClick={() => enterFolder(name)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-amber-50 hover:border-amber-200 transition-colors text-left"
                      >
                        <FolderSvg className="w-5 h-5 text-amber-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                          <p className="text-xs text-gray-400">{count} {count === 1 ? 'Datei' : 'Dateien'}</p>
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
                {childFolderNames.length > 0 && (
                  <div className="px-4 pt-4 pb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      {view.type === 'project' ? 'Dateien ohne Ordner' : 'Dateien'}
                    </p>
                  </div>
                )}
                {childFolderNames.length === 0 && view.type === 'folder' && (
                  <div className="px-4 pt-4 pb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Dateien ({viewFiles.length})
                    </p>
                  </div>
                )}
                <FileList files={viewFiles} />
              </>
            )}

            {childFolderNames.length === 0 && viewFiles.length === 0 && (
              <div className="px-4 py-10 text-center">
                <svg className="w-8 h-8 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm text-gray-400">Noch keine Inhalte.</p>
                <p className="text-xs text-gray-300 mt-1">Nutze „Hochladen" oder „Neuer Ordner" oben.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
