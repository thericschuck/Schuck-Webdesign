'use client'

import type { ProjectStatus } from '@/types/database'

const STAGES: { key: ProjectStatus; label: string }[] = [
  { key: 'briefing', label: 'Briefing' },
  { key: 'design', label: 'Design' },
  { key: 'development', label: 'Entwicklung' },
  { key: 'review', label: 'Review' },
  { key: 'live', label: 'Live' },
]

function stageIndex(status: ProjectStatus) {
  return STAGES.findIndex((s) => s.key === status)
}

export function StatusTimeline({ status }: { status: ProjectStatus }) {
  const current = stageIndex(status)

  return (
    <div className="w-full">
      <div className="hidden sm:grid grid-cols-5 gap-2 items-start">
        {STAGES.map((stage, i) => {
          const done = i < current
          const active = i === current
          const last = i === STAGES.length - 1

          return (
            <div key={stage.key} className="relative flex flex-col items-center gap-2">
              {!last && (
                <div
                  className={[
                    'absolute top-4 left-[calc(50%+18px)] right-[-calc(50%-18px)] h-0.5',
                    done ? 'bg-[#1C1C1E]' : 'bg-[#DED7CB]',
                  ].join(' ')}
                />
              )}

              <div
                className={[
                  'relative z-10 w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all bg-[#F7F5F0]',
                  done ? 'border-[#1C1C1E] bg-[#1C1C1E]' : '',
                  active ? 'border-[#1C1C1E] ring-4 ring-[#1C1C1E]/8' : '',
                  !done && !active ? 'border-[#D9D1C5]' : '',
                ].join(' ')}
              >
                {done ? (
                  <svg className="w-3.5 h-3.5 text-[#F5F5F0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : active ? (
                  <span className="w-2 h-2 rounded-full bg-[#1C1C1E]" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[#C9C1B5]" />
                )}
              </div>

              <span
                className={[
                  'text-xs text-center leading-tight',
                  done ? 'text-[#8C857A]' : '',
                  active ? 'text-[#1C1C1E]' : '',
                  !done && !active ? 'text-[#AAA296]' : '',
                ].join(' ')}
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col sm:hidden gap-0">
        {STAGES.map((stage, i) => {
          const done = i < current
          const active = i === current
          const last = i === STAGES.length - 1

          return (
            <div key={stage.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={[
                    'w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0 bg-[#F7F5F0]',
                    done ? 'bg-[#1C1C1E] border-[#1C1C1E]' : '',
                    active ? 'border-[#1C1C1E]' : '',
                    !done && !active ? 'border-[#D9D1C5]' : '',
                  ].join(' ')}
                >
                  {done ? (
                    <svg className="w-3 h-3 text-[#F5F5F0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : active ? (
                    <span className="w-2 h-2 rounded-full bg-[#1C1C1E]" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9C1B5]" />
                  )}
                </div>
                {!last && (
                  <div className={['w-0.5 h-5', done ? 'bg-[#1C1C1E]' : 'bg-[#DED7CB]'].join(' ')} />
                )}
              </div>
              <span
                className={[
                  'text-sm pt-0.5',
                  done ? 'text-[#8C857A]' : '',
                  active ? 'text-[#1C1C1E]' : '',
                  !done && !active ? 'text-[#AAA296]' : '',
                ].join(' ')}
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {stage.label}
                {active && <span className="ml-2 text-xs text-[#8C857A]">← aktuell</span>}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
