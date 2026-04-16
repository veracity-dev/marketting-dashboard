'use client'

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtNumber, fmtPercent, CHART_COLORS } from '@/lib/utils'
import type { GADeviceGeo } from '@/lib/types'

interface Props {
  rows: GADeviceGeo[]
  loading: boolean
}

function aggregateBy<K extends keyof GADeviceGeo>(rows: GADeviceGeo[], key: K) {
  const map: Record<string, { sessions: number; total_users: number }> = {}
  for (const r of rows) {
    const k = String(r[key] || 'Unknown')
    if (!map[k]) map[k] = { sessions: 0, total_users: 0 }
    map[k].sessions   += r.sessions
    map[k].total_users += r.total_users
  }
  return Object.entries(map)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.sessions - a.sessions)
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const pct = payload[0].percent ?? 0
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 shadow-xl text-xs">
      <p className="font-medium text-slate-200">{d.name}</p>
      <p className="text-slate-400">{fmtNumber(d.sessions)} sessions ({fmtPercent(pct)})</p>
    </div>
  )
}

export function DeviceGeoSection({ rows, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i}><Skeleton className="h-52 w-full" /></Card>
        ))}
      </div>
    )
  }

  const devices   = aggregateBy(rows, 'device_category')
  const countries = aggregateBy(rows, 'country')
  const totalSessions = devices.reduce((s, d) => s + d.sessions, 0)

  const DEVICE_ICONS: Record<string, string> = {
    mobile: '📱',
    desktop: '🖥️',
    tablet: '📋',
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Device breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Device Breakdown</CardTitle>
          <span className="text-xs text-slate-500">{fmtNumber(totalSessions)} sessions</span>
        </CardHeader>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={110} height={110}>
            <PieChart>
              <Pie data={devices} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="sessions">
                {devices.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-3">
            {devices.map((d, i) => {
              const pct = totalSessions > 0 ? (d.sessions / totalSessions) * 100 : 0
              return (
                <div key={d.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span>{DEVICE_ICONS[d.name.toLowerCase()] ?? '📡'}</span>
                      <span className="capitalize">{d.name}</span>
                    </span>
                    <span className="text-slate-400 tabular-nums">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Top countries */}
      <Card>
        <CardHeader>
          <CardTitle>Top Countries</CardTitle>
          <span className="text-xs text-slate-500">{countries.length} countries</span>
        </CardHeader>
        <div className="space-y-2.5">
          {countries.slice(0, 6).map((c, i) => {
            const pct = totalSessions > 0 ? (c.sessions / totalSessions) * 100 : 0
            return (
              <div key={c.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="w-4 text-center text-slate-500">{i + 1}</span>
                    <span className="text-slate-300">{c.name}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 tabular-nums">{fmtNumber(c.sessions)}</span>
                    <span className="w-10 text-right text-slate-400 tabular-nums">{pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-1 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
