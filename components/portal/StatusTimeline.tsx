'use client'

import type { ProjectStatus } from '@/types/database'

const STAGES: { key: ProjectStatus; label: string }[] = [
  { key: 'briefing',    label: 'Briefing'    },
  { key: 'design',      label: 'Design'      },
  { key: 'development', label: 'Entwicklung' },
  { key: 'review',      label: 'Review'      },
  { key: 'live',        label: 'Live'        },
]

function stageIndex(status: ProjectStatus) {
  return STAGES.findIndex((s) => s.key === status)
}

export function StatusTimeline({ status }: { status: ProjectStatus }) {
  const current = stageIndex(status)

  return (
    <div className="w-full">
      {/* Desktop: horizontal — connectors stretch to fill width, no scroll */}
      <div className="hidden sm:flex items-start w-full">
        {STAGES.map((stage, i) => {
          const done    = i < current
          const active  = i === current
          const last    = i === STAGES.length - 1

          return (
            <div
              key={stage.key}
              className={['flex items-start', !last ? 'flex-1' : ''].join(' ')}
            >
              {/* Step */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={[
                    'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                    done   ? 'bg-gray-900 border-gray-900'                     : '',
                    active ? 'bg-white border-gray-900 ring-4 ring-gray-900/8' : '',
                    !done && !active ? 'bg-white border-gray-200'              : '',
                  ].join(' ')}
                >
                  {done ? (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : active ? (
                    <span className="w-2 h-2 rounded-full bg-gray-900" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                  )}
                </div>
                <span
                  className={[
                    'text-xs font-medium whitespace-nowrap',
                    done   ? 'text-gray-400' : '',
                    active ? 'text-gray-900' : '',
                    !done && !active ? 'text-gray-400' : '',
                  ].join(' ')}
                >
                  {stage.label}
                </span>
              </div>

              {/* Connector — flexible width, aligned to circle center */}
              {!last && (
                <div
                  className={[
                    'flex-1 h-0.5 mt-4 mx-1 transition-colors',
                    done ? 'bg-gray-900' : 'bg-gray-200',
                  ].join(' ')}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="flex flex-col sm:hidden gap-0">
        {STAGES.map((stage, i) => {
          const done    = i < current
          const active  = i === current
          const last    = i === STAGES.length - 1

          return (
            <div key={stage.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={[
                    'w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0',
                    done   ? 'bg-gray-900 border-gray-900' : '',
                    active ? 'bg-white border-gray-900'    : '',
                    !done && !active ? 'bg-white border-gray-200' : '',
                  ].join(' ')}
                >
                  {done ? (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : active ? (
                    <span className="w-2 h-2 rounded-full bg-gray-900" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  )}
                </div>
                {!last && (
                  <div className={['w-0.5 h-5', done ? 'bg-gray-900' : 'bg-gray-200'].join(' ')} />
                )}
              </div>
              <span
                className={[
                  'text-sm font-medium pt-0.5',
                  done   ? 'text-gray-400' : '',
                  active ? 'text-gray-900' : '',
                  !done && !active ? 'text-gray-400' : '',
                ].join(' ')}
              >
                {stage.label}
                {active && <span className="ml-2 text-xs text-gray-500 font-normal">← aktuell</span>}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
