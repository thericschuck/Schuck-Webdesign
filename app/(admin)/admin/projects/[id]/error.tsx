'use client'

import { useEffect } from 'react'
import { MAX_UPLOAD_SIZE_MB } from '@/lib/uploadLimits'

export default function ProjectDetailError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[admin/projects/[id]]', error)
  }, [error])

  const isOversizedUpload = /unexpected end of form|body exceeded/i.test(error.message)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center max-w-lg mx-auto mt-10">
      <svg className="w-8 h-8 text-amber-400 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        {isOversizedUpload
          ? `Die Datei ist zu groß für den Upload (max. ${MAX_UPLOAD_SIZE_MB} MB).`
          : 'Beim Laden des Projekts ist etwas schiefgelaufen.'}
      </p>
      <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        {isOversizedUpload
          ? 'Bitte eine kleinere Datei wählen oder die Datei vor dem Hochladen verkleinern.'
          : 'Versuch es nochmal — falls es weiterhin auftritt, sag uns kurz Bescheid.'}
      </p>
      <button
        onClick={reset}
        className="mt-5 inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
      >
        Erneut versuchen
      </button>
    </div>
  )
}
