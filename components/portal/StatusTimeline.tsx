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
    <div className="w-full overflow-x-auto">
      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-center min-w-max">
        {STAGES.map((stage, i) => {
          const done    = i < current
          const active  = i === current
          const upcoming = i > current

          return (
            <div key={stage.key} className="flex items-center">
              {/* Step */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={[
                    'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all',
                    done    ? 'bg-black border-black'             : '',
                    active  ? 'bg-white border-black ring-4 ring-black/10' : '',
                    upcoming ? 'bg-white border-gray-200'          : '',
                  ].join(' ')}
                >
                  {done ? (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : active ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-black" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                  )}
                </div>
                <span
                  className={[
                    'text-xs font-medium whitespace-nowrap',
                    done    ? 'text-gray-500'  : '',
                    active  ? 'text-gray-900'  : '',
                    upcoming ? 'text-gray-400'  : '',
                  ].join(' ')}
                >
                  {stage.label}
                </span>
              </div>

              {/* Connector line */}
              {i < STAGES.length - 1 && (
                <div
                  className={[
                    'h-0.5 w-16 mx-1 mb-5 transition-colors',
                    i < current ? 'bg-black' : 'bg-gray-200',
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
          const upcoming = i > current
          const last     = i === STAGES.length - 1

          return (
            <div key={stage.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={[
                    'w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0',
                    done    ? 'bg-black border-black'   : '',
                    active  ? 'bg-white border-black'   : '',
                    upcoming ? 'bg-white border-gray-200' : '',
                  ].join(' ')}
                >
                  {done ? (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : active ? (
                    <span className="w-2 h-2 rounded-full bg-black" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                  )}
                </div>
                {!last && (
                  <div className={['w-0.5 h-6', i < current ? 'bg-black' : 'bg-gray-200'].join(' ')} />
                )}
              </div>
              <span
                className={[
                  'text-sm font-medium pt-1',
                  done    ? 'text-gray-400' : '',
                  active  ? 'text-gray-900' : '',
                  upcoming ? 'text-gray-400' : '',
                ].join(' ')}
              >
                {stage.label}
                {active && <span className="ml-2 text-xs text-black font-normal">← aktuell</span>}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
