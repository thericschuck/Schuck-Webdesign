'use client'

/** Generische Detail-Zeilen aus den rohen Tool-Argumenten — bewusst KEIN Rewrite der 22
 * bestätigungspflichtigen Tool-Defs für individuelle `details()`-Funktionen (siehe Athenas
 * ActionDetail-Pattern), das wäre unverhältnismäßiger Zusatzscope für diesen Umbau. */
function argDetails(args: unknown): { label: string; value: string }[] {
  if (!args || typeof args !== 'object') return []
  return Object.entries(args as Record<string, unknown>)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => ({
      label: key.replace(/_/g, ' '),
      value: typeof value === 'string' ? value : JSON.stringify(value),
    }))
}

export function HelmPendingActionCard({
  toolLabel,
  summary,
  args,
  onDecide,
}: {
  toolLabel: string
  summary: string
  args: unknown
  onDecide: (decision: 'approve' | 'reject') => void
}) {
  const details = argDetails(args)

  return (
    <div className="rounded-2xl px-4 py-3 border border-amber-400/25 bg-amber-400/10">
      <p className="text-amber-300 text-sm font-medium mb-2">Bestätigung erforderlich</p>
      <p className="text-xs text-white/70 mb-2">{summary || toolLabel}</p>

      {details.length > 0 && (
        <dl className="mb-3 flex flex-col gap-0.5 border-l border-white/10 pl-2.5">
          {details.map((d) => (
            <div key={d.label} className="flex gap-1.5 text-[11px]">
              <dt className="text-white/40">{d.label}:</dt>
              <dd className="text-white/60 truncate">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onDecide('approve')}
          className="px-3 py-1.5 rounded-lg bg-emerald-400/90 hover:bg-emerald-400 text-[#0d0d0d] text-xs font-medium transition-colors"
        >
          Bestätigen
        </button>
        <button
          type="button"
          onClick={() => onDecide('reject')}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors"
        >
          Ablehnen
        </button>
      </div>
    </div>
  )
}
