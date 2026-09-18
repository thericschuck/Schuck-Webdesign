'use client'

import { useEffect, useRef, useState } from 'react'
import { ALLOWED_AGENT_MODELS } from '@/lib/helm/catalog/models'
import { HELM_EFFORT_OPTIONS } from '@/lib/helm/settings'
import { useHelmChatSettings } from '@/components/providers/helm-settings-context'

const MODEL_LABELS: Record<string, string> = {
  'claude-opus-4-8': 'Opus',
  'claude-sonnet-5': 'Sonnet',
  'claude-haiku-4-5': 'Haiku',
}

/** Farbrampe Grün→Rot über die 5 Denktiefe-Stufen (oklch nimmt den kurzen Weg über den
 * Farbkreis via Gelb/Orange statt quer durch die Mitte) — Athenas EffortMeter-Pattern, gegen
 * HELMs eigene Token-Namen (--color-success/--color-danger existieren hier nicht, daher feste
 * Endfarben statt Theme-Variablen, da HELM kein eigenes Theme-Token-System hat). */
function effortTone(index: number, total: number): string {
  const anteil = total > 1 ? Math.round((index / (total - 1)) * 100) : 0
  return `color-mix(in oklch, #ef4444 ${anteil}%, #34d399)`
}

function EffortMeter({ level }: { level: number }) {
  return (
    <span aria-hidden className="flex items-end gap-[2px]">
      {HELM_EFFORT_OPTIONS.map((o, i) => (
        <span
          key={o.value}
          className="w-[3px] rounded-full transition-colors"
          style={{
            height: 4 + i * 2,
            background: i <= level ? effortTone(i, HELM_EFFORT_OPTIONS.length) : 'rgba(255,255,255,0.15)',
          }}
        />
      ))}
    </span>
  )
}

export function ModelEffortPicker() {
  const { model, effort, setModel, setEffort } = useHelmChatSettings()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const effortIndex = HELM_EFFORT_OPTIONS.findIndex((o) => o.value === effort)

  useEffect(() => {
    if (!open) return
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Modell ${MODEL_LABELS[model] ?? model}, Denktiefe ${HELM_EFFORT_OPTIONS[effortIndex]?.label ?? effort} — ändern`}
        className="flex h-7 items-center gap-2 rounded-full border border-white/10 px-2.5 text-xs text-white/50 transition-colors hover:border-white/25 hover:text-white"
      >
        <span className="font-medium">{MODEL_LABELS[model] ?? model}</span>
        <EffortMeter level={effortIndex} />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-20 mb-2 w-64 rounded-2xl border border-white/10 bg-[#151515] p-2 shadow-2xl shadow-black/50">
          <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-white/40">Modell</p>
          <div className="flex flex-col">
            {ALLOWED_AGENT_MODELS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModel(m)}
                className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/8 ${
                  model === m ? 'bg-white/8 text-white' : 'text-white/60'
                }`}
              >
                {MODEL_LABELS[m] ?? m}
              </button>
            ))}
          </div>

          <div className="mt-2 border-t border-white/10 pt-2">
            <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-white/40">Denktiefe</p>
            <div className="flex items-center gap-1 px-1">
              {HELM_EFFORT_OPTIONS.map((o, i) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setEffort(o.value)}
                  title={o.label}
                  aria-label={o.label}
                  className="group flex h-7 flex-1 items-center px-0.5"
                >
                  <span
                    className="block h-1.5 w-full rounded-full transition-colors"
                    style={{ background: i <= effortIndex ? effortTone(i, HELM_EFFORT_OPTIONS.length) : 'rgba(255,255,255,0.15)' }}
                  />
                </button>
              ))}
            </div>
            <div className="flex justify-between px-2 text-[10px] text-white/40">
              <span>schnell &amp; günstig</span>
              <span>gründlich &amp; teuer</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
