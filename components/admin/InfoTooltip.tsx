'use client'

import { useState } from 'react'

/** Eigenes Hover-Tooltip statt natives `title` — der Browser-Tooltip hat eine spürbare
 * Anzeige-Verzögerung (~1s) und lässt sich optisch nicht anpassen. Reagiert sofort auf
 * Hover/Fokus, Positionierung per CSS statt JS (kein Resize-Listener nötig). */
export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 text-[10px] font-semibold flex items-center justify-center hover:bg-gray-200 hover:text-gray-600 transition-colors cursor-help"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
        aria-label="Info"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-30 top-full right-0 mt-1.5 w-56 rounded-lg bg-gray-900 text-white text-xs leading-relaxed px-3 py-2 shadow-lg pointer-events-none"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
