'use client'

import { useCallback, useState, useRef } from 'react'
import { createPortalUploadTicket, registerPortalUpload } from './actions'
import { useDirectUpload } from '@/lib/use-direct-upload'
import { formatMb } from '@/lib/uploadLimits'
import type { ProjectStatus } from '@/types/database'

const STATUS_LABEL: Record<ProjectStatus, string> = {
  briefing:    'Briefing',
  design:      'Design',
  development: 'Entwicklung',
  review:      'Review',
  live:        'Live',
}

type Props = {
  projects: Array<{ id: string; title: string; status: string }>
  foldersByProject: Record<string, string[]>
}

export function UploadForm({ projects, foldersByProject }: Props) {
  const formRef      = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedProject, setSelectedProject] = useState('')
  const [folderInput, setFolderInput]         = useState('')
  const [file, setFile]                       = useState<File | null>(null)

  const requestTicket = useCallback((name: string) => createPortalUploadTicket(name), [])
  const register = useCallback(
    (path: string, name: string) =>
      registerPortalUpload(path, name, selectedProject || null, folderInput.trim() || null),
    [selectedProject, folderInput]
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
      formRef.current?.reset()
    }
  }

  const existingFolders = selectedProject ? (foldersByProject[selectedProject] ?? []) : []
  const suggestId = 'folder-suggestions'

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {/* Projekt auswählen */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="project_id" className="text-sm font-medium text-gray-700">
            Projekt <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          {projects.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Noch keine Projekte vorhanden.</p>
          ) : (
            <select
              id="project_id"
              name="project_id"
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value)
                setFolderInput('')
              }}
              disabled={pending}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 bg-white outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors"
            >
              <option value="">— Kein Projekt —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} · {STATUS_LABEL[p.status as ProjectStatus] ?? p.status}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Ordner */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="folder" className="text-sm font-medium text-gray-700">
            Ordner <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="folder"
            name="folder"
            type="text"
            list={existingFolders.length > 0 ? suggestId : undefined}
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            disabled={pending}
            placeholder='z.B. "Logos", "Fotoshoots", "Texte"'
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:opacity-50 transition-colors"
          />
          {existingFolders.length > 0 && (
            <datalist id={suggestId}>
              {existingFolders.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          )}
          {existingFolders.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {existingFolders.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFolderInput(f)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    folderInput === f
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Datei */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <label
          htmlFor="file"
          className={[
            'flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
            pending
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : file
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
          ].join(' ')}
        >
          <div className="flex flex-col items-center gap-2 text-center px-4">
            {file ? (
              <>
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-green-700 truncate max-w-xs">{file.name}</p>
                <p className="text-xs text-gray-400">{formatMb(file.size)} MB · Klicken um andere Datei wählen</p>
              </>
            ) : (
              <>
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-700">Datei auswählen</p>
                  <p className="text-xs text-gray-400">Alle gängigen Dateitypen – große Bilder werden automatisch verkleinert</p>
                </div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            id="file"
            name="file"
            type="file"
            className="hidden"
            disabled={pending}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {/* Erlaubte Typen */}
        <div className="grid grid-cols-3 gap-y-1.5 gap-x-3">
          {[
            { ext: 'PDF', desc: 'Dokumente' },
            { ext: 'JPG / PNG', desc: 'Fotos' },
            { ext: 'SVG', desc: 'Logos' },
            { ext: 'ZIP', desc: 'Pakete' },
            { ext: 'DOCX', desc: 'Word' },
            { ext: 'TXT', desc: 'Texte' },
          ].map(({ ext, desc }) => (
            <div key={ext} className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 shrink-0">{ext}</span>
              <span className="text-xs text-gray-400">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback */}
      {notice && <p className="text-sm text-gray-500">{notice}</p>}
      {uploadedName && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          ✓ <strong>{uploadedName}</strong> erfolgreich hochgeladen.
        </div>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending || !file}
        className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {phase !== 'idle' ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {phaseLabel}
          </span>
        ) : 'Hochladen'}
      </button>
    </form>
  )
}
