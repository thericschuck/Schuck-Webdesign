'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { ProjectStatus } from '@/types/database'
import { STATUS_DOT } from './status-constants'

export interface SwitcherProject {
  id: string
  title: string
  status: string
}

/**
 * Projekt-Umschalter als Client-Komponente.
 *
 * Vorher war das ein reines <Link>-Raster: jeder Wechsel war eine normale Navigation,
 * bei der Next.js die komplette Seite durch `loading.tsx` ersetzt hat — inklusive des
 * Umschalters selbst. Man klickte auf ein Projekt und der angeklickte Button verschwand.
 *
 * Jetzt läuft der Wechsel in einer `useTransition` — Next.js lässt die bestehende Seite
 * stehen, bis die neuen Daten da sind, statt sie durch den Skeleton zu ersetzen. Die
 * aktive Pille springt sofort auf das angeklickte Projekt (optimistisch), der Rest der
 * Seite blendet währenddessen leicht ab. Das ist derselbe Ansatz wie bei den
 * Board-Ansichten im Admin-Bereich.
 */
export function ProjectSwitcher({
  projects,
  selectedId,
}: {
  projects: SwitcherProject[]
  selectedId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticId, setOptimisticId] = useState<string | null>(null)

  // Nach abgeschlossenem Wechsel gewinnt wieder der Server-Wert.
  const activeId = isPending && optimisticId ? optimisticId : selectedId

  function switchTo(id: string) {
    if (id === selectedId) return
    setOptimisticId(id)
    startTransition(() => router.push(`/portal/project?id=${id}`, { scroll: false }))
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 transition-opacity ${isPending ? 'opacity-70' : ''}`}>
      <Link
        href="/portal"
        className="mr-1 inline-flex items-center gap-1.5 text-xs text-[#8A847B] transition-colors hover:text-[#1C1C1E]"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Alle Projekte
      </Link>

      <div className="h-4 w-px bg-black/8" />

      {projects.map((p) => {
        const isActive = p.id === activeId
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => switchTo(p.id)}
            aria-current={isActive ? 'page' : undefined}
            className={[
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors',
              isActive
                ? 'bg-[#1C1C1E] text-[#F5F5F0]'
                : 'bg-[#ECE7DD] text-[#6B655D] hover:bg-[#E2DDD5]',
            ].join(' ')}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                isActive ? 'bg-white/60' : STATUS_DOT[p.status as ProjectStatus]
              }`}
            />
            <span className="max-w-40 truncate">{p.title}</span>
          </button>
        )
      })}
    </div>
  )
}
