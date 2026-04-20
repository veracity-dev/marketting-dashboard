'use client'

import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtDate, fmtNumber, fmtPercent } from '@/lib/utils'
import type { GSCDailyOverview } from '@/lib/types'

interface Props {
  rows: GSCDailyOverview[]
  loading: boolean
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl text-xs">
      <p className="mb-2 font-medium text-slate-300">{fmtDate(label)}</p>
      {payload.map((p: any) => {
        const value = p.dataKey === 'CTR' ? fmtPercent(p.value)
                    : p.dataKey === 'Position' ? p.value.toFixed(1)
                    : fmtNumber(p.value)
        return (
          <div key={p.dataKey} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-400">{p.name}:</span>
            <span className="font-medium text-slate-200">{value}</span>
          </div>
        )
      })}
    </div>
  )
}

export function GSCTrendChart({ rows, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Clicks & Impressions Over Time</CardTitle></CardHeader>
        <Skeleton className="h-64 w-full" />
      </Card>
    )
  }

  const data = rows.map((r) => ({
    date: r.report_date,
    Clicks: r.clicks,
    Impressions: r.impressions,
    CTR: r.ctr,
    Position: r.position,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clicks & Impressions Over Time</CardTitle>
        <span className="text-xs text-slate-500">{rows.length} days</span>
      </CardHeader>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 4, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false} tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(v) => fmtNumber(v)}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v) => fmtNumber(v)}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false} tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 12 }} />
          <Bar yAxisId="right" dataKey="Impressions" fill="#0ea5e9" opacity={0.35} />
          <Line yAxisId="left" type="monotone" dataKey="Clicks"
                stroke="#10b981" strokeWidth={2} dot={false}
                activeDot={{ r: 4, fill: '#10b981' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  )
}
