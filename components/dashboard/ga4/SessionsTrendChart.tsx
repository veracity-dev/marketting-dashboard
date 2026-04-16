'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtDate, fmtNumber } from '@/lib/utils'
import type { GADailyOverview } from '@/lib/types'

interface Props {
  rows: GADailyOverview[]
  loading: boolean
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl text-xs">
      <p className="mb-2 font-medium text-slate-300">{fmtDate(label)}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-medium text-slate-200">{fmtNumber(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function SessionsTrendChart({ rows, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Sessions Over Time</CardTitle></CardHeader>
        <Skeleton className="h-64 w-full" />
      </Card>
    )
  }

  const data = rows.map((r) => ({
    date:     r.report_date,
    Sessions: r.sessions,
    Users:    r.total_users,
    'Page Views': r.screen_page_views,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessions & Users Over Time</CardTitle>
        <span className="text-xs text-slate-500">{rows.length} days</span>
      </CardHeader>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => fmtNumber(v)}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 12 }}
          />
          <Line
            type="monotone"
            dataKey="Sessions"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#6366f1' }}
          />
          <Line
            type="monotone"
            dataKey="Users"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#8b5cf6' }}
          />
          <Line
            type="monotone"
            dataKey="Page Views"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#06b6d4' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
