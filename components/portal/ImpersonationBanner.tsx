import { stopImpersonation } from '@/lib/actions/impersonation'

/**
 * Sichtbarer Hinweis, dass gerade nicht der Kunde selbst, sondern der Admin in der
 * Kundenansicht unterwegs ist — inklusive Rückweg. Bewusst `sticky` und in kräftigem
 * Amber: alles, was hier getan wird (Upload, Umbenennen, Löschen), passiert wirklich
 * im Namen des Kunden.
 */
export function ImpersonationBanner({ clientLabel }: { clientLabel: string }) {
  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-amber-950" style={{ fontFamily: 'var(--font-dm-sans)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          Kundenansicht: <span className="font-semibold">{clientLabel}</span> — Aktionen wirken im Namen des Kunden.
        </p>
        <form action={stopImpersonation}>
          <button
            type="submit"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-950 text-amber-50 hover:bg-amber-900 transition-colors"
          >
            Zurück zum Admin
          </button>
        </form>
      </div>
    </div>
  )
}
