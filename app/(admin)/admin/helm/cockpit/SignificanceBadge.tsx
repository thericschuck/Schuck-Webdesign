import type { Significance } from './types'

/** notable = auffällig hervorgehoben, normal = neutrales Badge, trivial = gedimmt/klein
 * ohne Badge-Box — Darstellungs-Konvention aus HELM_COCKPIT_KONZEPT.md Entscheidung 2:
 * nichts wird gefiltert, nur die Aufmerksamkeit gelenkt. */
export function SignificanceBadge({ significance }: { significance: Significance }) {
  if (significance === 'trivial') {
    return <span className="text-[11px] text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>trivial</span>
  }
  if (significance === 'notable') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#7F77DD]/10 text-[#6b62d1]"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#7F77DD]" />
        auffällig
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600"
      style={{ fontFamily: 'var(--font-dm-sans)' }}
    >
      normal
    </span>
  )
}
