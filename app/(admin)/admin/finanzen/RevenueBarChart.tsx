'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

const MONTH_LABEL = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

const BAR_COLOR = '#2a78d6' // dataviz-Skill: sequentielle Standardfarbe „blue“, Stufe 450

function monthLabel(month: string) {
  const [, monthNum] = month.split('-')
  return MONTH_LABEL[Number(monthNum) - 1] ?? month
}

function fmtEuroShort(n: number) {
  if (n >= 1000) return `${(n / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })}k €`
  return `${Math.round(n).toLocaleString('de-DE')} €`
}

function fmtEuro(n: number) {
  return `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

function ChartTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
  const point = payload[0]
  return (
    <div
      className="bg-white border border-gray-100 shadow-sm rounded-lg px-3 py-2"
      style={{ fontFamily: 'var(--font-dm-sans)' }}
    >
      <p className="text-xs text-gray-400 mb-0.5">{monthLabel(String(point.payload.month))}</p>
      <p className="text-sm text-gray-900 font-semibold">{fmtEuro(Number(point.value))}</p>
    </div>
  )
}

export function RevenueBarChart({ data }: { data: { month: string; total_net: number }[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        Noch keine Umsatzdaten im gewählten Zeitraum.
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="24%">
        <CartesianGrid vertical={false} stroke="#f3f4f6" />
        <XAxis
          dataKey="month"
          tickFormatter={monthLabel}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb' }}
          tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'var(--font-dm-sans)' }}
        />
        <YAxis
          tickFormatter={fmtEuroShort}
          tickLine={false}
          axisLine={false}
          width={56}
          tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'var(--font-dm-sans)' }}
        />
        <Tooltip cursor={{ fill: '#f9fafb' }} content={(props) => <ChartTooltip {...props} />} />
        <Bar dataKey="total_net" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}
