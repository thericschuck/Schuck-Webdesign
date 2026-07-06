const MONTH_LABEL = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function fmtEuroShort(n: number) {
  if (n >= 1000) return `${(n / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })}k €`
  return `${Math.round(n)} €`
}

/** Leichtgewichtiges SVG-Balkendiagramm — keine externe Chart-Lib nötig, rein serverseitig gerendert. */
export function RevenueBarChart({ data }: { data: { month: string; total_net: number }[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        Noch keine Umsatzdaten im gewählten Zeitraum.
      </p>
    )
  }

  const width = 640
  const height = 220
  const paddingBottom = 28
  const paddingTop = 16
  const chartHeight = height - paddingBottom - paddingTop
  const barGap = 12
  const barWidth = (width - barGap * (data.length + 1)) / data.length
  const max = Math.max(...data.map((d) => d.total_net), 1)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Umsatz pro Monat">
      {data.map((d, i) => {
        const barHeight = Math.max((d.total_net / max) * chartHeight, d.total_net > 0 ? 3 : 0)
        const x = barGap + i * (barWidth + barGap)
        const y = paddingTop + (chartHeight - barHeight)
        const [, monthNum] = d.month.split('-')
        const label = MONTH_LABEL[Number(monthNum) - 1] ?? d.month

        return (
          <g key={d.month}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx={3} className="fill-violet-500" />
            {d.total_net > 0 && (
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-gray-600"
                style={{ fontSize: 9, fontFamily: 'var(--font-dm-sans)' }}
              >
                {fmtEuroShort(d.total_net)}
              </text>
            )}
            <text
              x={x + barWidth / 2}
              y={height - paddingBottom + 16}
              textAnchor="middle"
              className="fill-gray-400"
              style={{ fontSize: 10, fontFamily: 'var(--font-dm-sans)' }}
            >
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
