'use client'

import { useEffect, useState } from 'react'

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'])

function fileExt(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export function DocumentPreviewPanel({
  fileName,
  fileUrl,
  getSignedUrl,
  onClose,
}: {
  fileName: string
  fileUrl: string
  getSignedUrl: (fileUrl: string) => Promise<string | null>
  onClose: () => void
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const ext = fileExt(fileName)
  const isPdf = ext === 'pdf'
  const isImage = IMAGE_EXTENSIONS.has(ext)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSignedUrl(null)
    getSignedUrl(fileUrl).then((url) => {
      if (!cancelled) {
        setSignedUrl(url)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [fileUrl, getSignedUrl])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleDownload() {
    setDownloading(true)
    try {
      const url = signedUrl ?? await getSignedUrl(fileUrl)
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
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{fileName}</p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloading ? 'Lädt…' : 'Download'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-gray-50 flex items-center justify-center overflow-auto">
          {loading ? (
            <svg className="w-6 h-6 text-gray-300 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : !signedUrl ? (
            <p className="text-sm text-gray-400">Vorschau konnte nicht geladen werden.</p>
          ) : isPdf ? (
            <iframe src={signedUrl} title={fileName} className="w-full h-full border-0" />
          ) : isImage ? (
            <img src={signedUrl} alt={fileName} className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-center px-6">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H8.25m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v14.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-sm text-gray-500">Keine Vorschau für diesen Dateityp verfügbar.</p>
              <p className="text-xs text-gray-400">Lade die Datei herunter, um sie zu öffnen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
