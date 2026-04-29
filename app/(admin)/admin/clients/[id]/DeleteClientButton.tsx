'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteClient } from './actions'

export function DeleteClientButton({
  clientId,
  companyName,
}: {
  clientId: string
  companyName: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteClient(clientId)
      if (result.status === 'error') {
        setError(result.message)
        setShowConfirm(false)
      } else {
        router.push('/admin/clients')
      }
    })
  }

  if (showConfirm) {
    return (
      <div className="flex flex-col gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
        <p className="text-sm text-gray-800 font-medium" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          <strong>{companyName}</strong> wirklich löschen?
        </p>
        <p className="text-xs text-gray-500 leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Alle Projekte, Dokumente und der Login-Zugang werden dauerhaft gelöscht. Das kann nicht rückgängig gemacht werden.
        </p>
        {error && (
          <p className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {isPending ? 'Löschen…' : 'Ja, endgültig löschen'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isPending}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Abbrechen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {error}
        </p>
      )}
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Kunden löschen
      </button>
    </div>
  )
}
