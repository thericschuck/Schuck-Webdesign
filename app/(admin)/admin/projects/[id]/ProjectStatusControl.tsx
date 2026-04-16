'use client'

import { useTransition } from 'react'
import { updateProjectStatus } from './actions'
import type { ProjectStatus } from '@/types/database'

type Props = {
  projectId: string
  currentStatus: ProjectStatus
  statusOrder: ProjectStatus[]
  statusLabel: Record<ProjectStatus, string>
}

const STATUS_BG: Record<ProjectStatus, string> = {
  briefing: 'bg-gray-200 text-gray-700',
  design: 'bg-blue-100 text-blue-800',
  development: 'bg-amber-100 text-amber-800',
  review: 'bg-purple-100 text-purple-800',
  live: 'bg-green-100 text-green-800',
}

const STATUS_ACTIVE: Record<ProjectStatus, string> = {
  briefing: 'bg-gray-700 text-white',
  design: 'bg-blue-600 text-white',
  development: 'bg-amber-500 text-white',
  review: 'bg-purple-600 text-white',
  live: 'bg-green-600 text-white',
}

export function ProjectStatusControl({ projectId, currentStatus, statusOrder, statusLabel }: Props) {
  const [isPending, startTransition] = useTransition()

  const handleStatusChange = (status: ProjectStatus) => {
    startTransition(async () => {
      await updateProjectStatus(projectId, status)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {statusOrder.map((status, idx) => {
        const isActive = status === currentStatus
        const isPast = statusOrder.indexOf(currentStatus) > idx

        return (
          <button
            key={status}
            onClick={() => handleStatusChange(status)}
            disabled={isPending || isActive}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
              isActive
                ? STATUS_ACTIVE[status]
                : isPast
                ? 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                : STATUS_BG[status] + ' hover:opacity-80'
            } disabled:cursor-default`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs ${
              isActive ? 'bg-white/20' : isPast ? 'bg-gray-200' : 'bg-white/30'
            }`}>
              {isPast ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-[10px]">{idx + 1}</span>
              )}
            </span>
            {statusLabel[status]}
            {isActive && (
              <span className="ml-auto text-xs opacity-70">aktuell</span>
            )}
          </button>
        )
      })}

      {isPending && (
        <p className="text-xs text-gray-400 text-center mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Speichern…
        </p>
      )}
    </div>
  )
}
