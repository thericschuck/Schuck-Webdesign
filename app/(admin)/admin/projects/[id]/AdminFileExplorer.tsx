'use client'

import { useActionState, useState, useRef, useEffect } from 'react'
import { adminUploadFile, adminDeleteFile } from './actions'

type DocRow = {
  id: string
  name: string
  file_url: string
  folder: string | null
  created_at: string
  signedUrl: string | null
}

type View =
  | { type: 'project' }
  | { type: 'folder'; folder: string }

type UploadState =
  | { status: 'success'; fileName: string }
  | { status: 'error'; message: string }
  | null

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Upload Form ───────────────────────────────────────────────────────────────

function UploadForm({
  projectId,
  clientId,
  folder,
  availableFolders,
}: {
  projectId: string
  clientId: string
  folder: string | null
  availableFolders: string[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [folderInput, setFolderInput] = useState(folder ?? '')
  const [dragOver, setDragOver] = useState(false)

  const [uploadState, uploadAction, uploadPending] = useActionState<UploadState, FormData>(
    adminUploadFile,
    null
  )

  useEffect(() => {
    if (uploadState?.status === 'success') {
      setSelectedFile(null)
      formRef.current?.reset()
      setFolderInput(folder ?? '')
    }
  }, [uploadState, folder])

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

      {folder === null ? (
        <div className="flex items-center gap-2">
          <FolderSvg className="w-4 h-4 text-gray-300 shrink-0" />
          <input
            name="folder"
            type="text"
            list="admin-folder-datalist"
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            placeholder="Ordner (optional)"
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 min-w-0"
          />
          {availableFolders.length > 0 && (
            <datalist id="admin-folder-datalist">
              {availableFolders.map((f) => <option key={f} value={f} />)}
            </datalist>
          )}
        </div>
      ) : (
        <input type="hidden" name="folder" value={folder} />
      )}

      <label
        className={`flex items-center gap-3 w-full rounded-xl border-2 border-dashed px-4 py-3 cursor-pointer transition-colors ${
          dragOver
            ? 'border-gray-700 bg-gray-50'
            : selectedFile
            ? 'border-green-400 bg-green-50'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
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
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-sm text-gray-400 flex-1">Datei wählen oder hierher ziehen</span>
            <span className="text-xs text-gray-300 shrink-0">max. 10 MB</span>
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

// ── File List ────────────────────────────────────────────────────────────────

function FileList({ files, projectId }: { files: DocRow[]; projectId: string }) {
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
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {doc.signedUrl ? (
              <a
                href={doc.signedUrl}
                download={doc.name}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
            ) : (
              <span className="text-xs text-gray-200">—</span>
            )}
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
}: {
  projectId: string
  clientId: string
  documents: DocRow[]
}) {
  const [view, setView] = useState<View>({ type: 'project' })
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const newFolderInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (creatingFolder) newFolderInputRef.current?.focus()
  }, [creatingFolder])

  const folderNames = [...new Set(documents.map((d) => d.folder).filter(Boolean) as string[])]

  const rootFiles = documents.filter((d) => !d.folder)
  const folderFiles = view.type === 'folder'
    ? documents.filter((d) => d.folder === view.folder)
    : []

  const isProject = view.type === 'project'
  const uploadFolder = view.type === 'folder' ? view.folder : null

  function enterFolder(name: string) {
    setView({ type: 'folder', folder: name })
    setCreatingFolder(false)
    setNewFolderName('')
  }

  function confirmNewFolder() {
    const name = newFolderName.trim()
    if (!name) { setCreatingFolder(false); setNewFolderName(''); return }
    enterFolder(name)
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">

      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <button
          onClick={() => { setView({ type: 'project' }); setCreatingFolder(false) }}
          disabled={isProject}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-0 disabled:pointer-events-none transition-colors"
          aria-label="Zurück"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <nav className="flex items-center gap-1 text-sm flex-1 min-w-0 overflow-hidden">
          <button
            onClick={() => { setView({ type: 'project' }); setCreatingFolder(false) }}
            className={`shrink-0 transition-colors ${isProject ? 'text-gray-900 font-medium' : 'text-gray-400 hover:text-gray-700'}`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Dateien
          </button>
          {view.type === 'folder' && (
            <>
              <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-900 font-medium truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {view.folder}
              </span>
            </>
          )}
        </nav>

        <span className="text-xs text-gray-400 shrink-0" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {documents.length} {documents.length === 1 ? 'Datei' : 'Dateien'}
        </span>
      </div>

      {/* ══ PROJECT LEVEL ══ */}
      {isProject && (
        <div>
          {/* Ordner-Grid */}
          <div className="px-4 pt-4 pb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Ordner
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {folderNames.map((name) => {
                const count = documents.filter((d) => d.folder === name).length
                return (
                  <button
                    key={name}
                    onClick={() => enterFolder(name)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-amber-50 hover:border-amber-200 transition-colors group text-left"
                  >
                    <FolderSvg className="w-5 h-5 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>{name}</p>
                      <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>{count} {count === 1 ? 'Datei' : 'Dateien'}</p>
                    </div>
                  </button>
                )
              })}

              {creatingFolder ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-300 bg-white">
                  <FolderSvg className="w-5 h-5 text-amber-300 shrink-0" />
                  <input
                    ref={newFolderInputRef}
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmNewFolder()
                      if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName('') }
                    }}
                    placeholder="Ordnername"
                    className="flex-1 min-w-0 text-sm bg-transparent outline-none text-gray-900 placeholder-gray-300"
                  />
                  <button
                    type="button"
                    onClick={confirmNewFolder}
                    className="shrink-0 w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreatingFolder(true)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>Neuer Ordner</span>
                </button>
              )}
            </div>
          </div>

          <div className="mx-4 border-t border-gray-100" />

          {/* Upload */}
          <div className="px-4 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Datei hochladen
            </p>
            <UploadForm projectId={projectId} clientId={clientId} folder={null} availableFolders={folderNames} />
          </div>

          {/* Root-Dateien */}
          {rootFiles.length > 0 && (
            <>
              <div className="mx-4 border-t border-gray-100" />
              <div className="px-4 pt-4 pb-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Dateien ohne Ordner
                </p>
              </div>
              <FileList files={rootFiles} projectId={projectId} />
            </>
          )}

          {folderNames.length === 0 && rootFiles.length === 0 && !creatingFolder && (
            <div className="px-4 pb-6 pt-0 text-center">
              <p className="text-xs text-gray-300" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Noch keine Dateien — lade eine Datei hoch oder erstelle einen Ordner.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══ FOLDER LEVEL ══ */}
      {view.type === 'folder' && (
        <div>
          <div className="px-4 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              Datei hochladen
            </p>
            <UploadForm projectId={projectId} clientId={clientId} folder={view.folder} availableFolders={folderNames} />
          </div>

          {folderFiles.length > 0 ? (
            <>
              <div className="px-4 pt-4 pb-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Dateien ({folderFiles.length})
                </p>
              </div>
              <FileList files={folderFiles} projectId={projectId} />
            </>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-gray-300" style={{ fontFamily: 'var(--font-dm-sans)' }}>Noch keine Dateien in diesem Ordner.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
