'use client'

import { Users, MousePointerClick, Clock, TrendingUp, Activity } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fmtNumber,
  fmtPercent,
  fmtDuration,
  calcDelta,
} from '@/lib/utils'
import type { GADailyOverview } from '@/lib/types'

interface KPI {
  label: string
  value: string
  raw: number
  delta?: number | null
  icon: React.ElementType
  color: string
  description: string
}

function DeltaBadge({ delta }: { delta: number | null | undefined }) {
  if (delta === null || delta === undefined) return null
  const up = delta >= 0
  return (
    <span className={`text-xs font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
      {up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
    </span>
  )
}

interface Props {
  rows: GADailyOverview[]
  loading: boolean
}

function aggregate(rows: GADailyOverview[]) {
  if (!rows.length) return null
  const totals = rows.reduce(
    (acc, r) => ({
      sessions:             acc.sessions + r.sessions,
      total_users:          acc.total_users + r.total_users,
      new_users:            acc.new_users + r.new_users,
      screen_page_views:    acc.screen_page_views + r.screen_page_views,
      bounce_rate_sum:      acc.bounce_rate_sum + r.bounce_rate,
      avg_session_sum:      acc.avg_session_sum + r.avg_session_duration,
      engagement_rate_sum:  acc.engagement_rate_sum + r.engagement_rate,
      engaged_sessions:     acc.engaged_sessions + r.engaged_sessions,
    }),
    { sessions: 0, total_users: 0, new_users: 0, screen_page_views: 0,
      bounce_rate_sum: 0, avg_session_sum: 0, engagement_rate_sum: 0, engaged_sessions: 0 }
  )
  const n = rows.length
  return {
    sessions:            totals.sessions,
    total_users:         totals.total_users,
    new_users:           totals.new_users,
    screen_page_views:   totals.screen_page_views,
    bounce_rate:         totals.bounce_rate_sum / n,
    avg_session_duration:totals.avg_session_sum / n,
    engagement_rate:     totals.engagement_rate_sum / n,
    engaged_sessions:    totals.engaged_sessions,
  }
}

export function KPIGrid({ rows, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="mb-3 h-4 w-20" />
            <Skeleton className="mb-2 h-8 w-24" />
            <Skeleton className="h-3 w-16" />
          </Card>
        ))}
      </div>
    )
  }

  const agg = aggregate(rows)
  if (!agg) return null

  const kpis: KPI[] = [
    {
      label: 'Sessions',
      value: fmtNumber(agg.sessions),
      raw: agg.sessions,
      icon: Activity,
      color: 'text-indigo-400',
      description: 'Total sessions in period',
    },
    {
      label: 'Total Users',
      value: fmtNumber(agg.total_users),
      raw: agg.total_users,
      icon: Users,
      color: 'text-violet-400',
      description: `${fmtNumber(agg.new_users)} new users`,
    },
    {
      label: 'Page Views',
      value: fmtNumber(agg.screen_page_views),
      raw: agg.screen_page_views,
      icon: MousePointerClick,
      color: 'text-cyan-400',
      description: `${(agg.screen_page_views / Math.max(agg.sessions, 1)).toFixed(1)} pages/session`,
    },
    {
      label: 'Engagement Rate',
      value: fmtPercent(agg.engagement_rate),
      raw: agg.engagement_rate,
      icon: TrendingUp,
      color: 'text-emerald-400',
      description: `${fmtNumber(agg.engaged_sessions)} engaged sessions`,
    },
    {
      label: 'Avg. Session',
      value: fmtDuration(agg.avg_session_duration),
      raw: agg.avg_session_duration,
      icon: Clock,
      color: 'text-amber-400',
      description: `${fmtPercent(agg.bounce_rate)} bounce rate`,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <Card key={kpi.label} className="group hover:border-slate-700 transition-colors">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {kpi.label}
              </span>
              <div className={`rounded-lg bg-slate-800 p-1.5 ${kpi.color}`}>
                <Icon size={14} />
              </div>
            </div>
            <div className="mb-1 text-2xl font-bold text-slate-100 tabular-nums">
              {kpi.value}
            </div>
            <div className="flex items-center gap-1.5">
              {kpi.delta !== undefined && <DeltaBadge delta={kpi.delta} />}
              <span className="text-xs text-slate-500">{kpi.description}</span>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
