'use client'

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtNumber, fmtPercent, channelColor } from '@/lib/utils'
import type { GATrafficSource } from '@/lib/types'

interface Props {
  rows: GATrafficSource[]
  loading: boolean
}

function aggregateByChannel(rows: GATrafficSource[]) {
  const map: Record<string, { sessions: number; bounce_rate: number; engagement_rate: number; count: number }> = {}
  for (const r of rows) {
    const ch = r.channel_group || 'Unassigned'
    if (!map[ch]) map[ch] = { sessions: 0, bounce_rate: 0, engagement_rate: 0, count: 0 }
    map[ch].sessions       += r.sessions
    map[ch].bounce_rate    += r.bounce_rate
    map[ch].engagement_rate += r.engagement_rate
    map[ch].count++
  }
  return Object.entries(map)
    .map(([channel, v]) => ({
      channel,
      sessions:        v.sessions,
      bounce_rate:     v.bounce_rate / v.count,
      engagement_rate: v.engagement_rate / v.count,
      color: channelColor(channel),
    }))
    .sort((a, b) => b.sessions - a.sessions)
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl text-xs">
      <p className="mb-2 font-medium text-slate-200">{d.channel}</p>
      <p className="text-slate-400">Sessions: <span className="text-slate-200 font-medium">{fmtNumber(d.sessions)}</span></p>
      <p className="text-slate-400">Engagement: <span className="text-slate-200 font-medium">{fmtPercent(d.engagement_rate)}</span></p>
      <p className="text-slate-400">Bounce: <span className="text-slate-200 font-medium">{fmtPercent(d.bounce_rate)}</span></p>
    </div>
  )
}

export function TrafficSourcesChart({ rows, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Traffic Sources</CardTitle></CardHeader>
        <Skeleton className="h-64 w-full" />
      </Card>
    )
  }

  const data = aggregateByChannel(rows)
  const total = data.reduce((s, d) => s + d.sessions, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Traffic Channels</CardTitle>
        <span className="text-xs text-slate-500">{fmtNumber(total)} total sessions</span>
      </CardHeader>

      <div className="flex gap-4">
        {/* Donut */}
        <div className="flex-shrink-0">
          <ResponsiveContainer width={130} height={130}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={58}
                paddingAngle={2}
                dataKey="sessions"
              >
                {data.map((entry) => (
                  <Cell key={entry.channel} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with bars */}
        <div className="flex-1 space-y-2 pt-1">
          {data.slice(0, 7).map((d) => (
            <div key={d.channel}>
              <div className="mb-0.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-300 truncate max-w-[120px]">{d.channel}</span>
                </div>
                <span className="text-slate-400 tabular-nums">{fmtNumber(d.sessions)}</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-1 rounded-full transition-all duration-700"
                  style={{
                    width: `${total > 0 ? (d.sessions / total) * 100 : 0}%`,
                    backgroundColor: d.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement bar chart */}
      <div className="mt-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Engagement Rate by Channel</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data.slice(0, 6)} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="channel"
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.split(' ')[0]}
            />
            <YAxis
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v) => [fmtPercent(Number(v)), 'Engagement']}
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Bar dataKey="engagement_rate" radius={[3, 3, 0, 0]}>
              {data.slice(0, 6).map((d) => (
                <Cell key={d.channel} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
