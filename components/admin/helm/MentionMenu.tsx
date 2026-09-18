'use client'

import { MENTIONABLE_PERSONAS } from '@/lib/helm/personas'
import { PersonaAvatar } from './PersonaAvatar'

/**
 * Popover über dem Composer, ausgelöst durch "@" am Anfang der Eingabe (siehe HelmChat.tsx) —
 * Langdock-Pattern: eine Nachricht direkt an einen Sub-Agenten adressieren, der dann mit
 * vollem Gesprächskontext, aber seiner eigenen Persona/seinem Systemprompt antwortet (siehe
 * app/api/helm/chat/route.ts, Mention-Zweig).
 */
export function MentionMenu({ query, onSelect }: { query: string; onSelect: (slug: string) => void }) {
  const matches = MENTIONABLE_PERSONAS.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()))

  if (matches.length === 0) {
    return (
      <div className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-2xl border border-white/10 bg-[#151515] p-3 shadow-2xl shadow-black/50">
        <p className="text-xs text-white/40">Kein Agent gefunden.</p>
      </div>
    )
  }

  return (
    <div className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-2xl border border-white/10 bg-[#151515] p-1.5 shadow-2xl shadow-black/50">
      {matches.map((persona) => (
        <button
          key={persona.slug}
          type="button"
          // onMouseDown statt onClick: verhindert, dass die Textarea vorher den Blur/die
          // Cursor-Position verliert, bevor der Klick verarbeitet wird.
          onMouseDown={(e) => {
            e.preventDefault()
            onSelect(persona.slug)
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/8"
        >
          <PersonaAvatar persona={persona} size={28} />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-white">{persona.label}</span>
            <span className="block truncate text-[11px] text-white/40">{persona.description}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
