'use client'

import { useTransition } from 'react'
import { toggleArticleActiveAction } from './actions'

export function ActiveToggle({ artNr, aktiv }: { artNr: string; aktiv: boolean }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => toggleArticleActiveAction(artNr, !aktiv))}
      disabled={isPending}
      className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 ${
        aktiv ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
      style={{ fontFamily: 'var(--font-dm-sans)' }}
    >
      {aktiv ? 'Aktiv' : 'Inaktiv'}
    </button>
  )
}
