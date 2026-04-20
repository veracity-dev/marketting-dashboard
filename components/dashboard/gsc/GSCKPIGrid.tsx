'use client'

import { MousePointerClick, Eye, Percent, TrendingDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtNumber, fmtPercent } from '@/lib/utils'
import type { GSCDailyOverview } from '@/lib/types'

interface Props {
  rows: GSCDailyOverview[]
  loading: boolean
}

function aggregate(rows: GSCDailyOverview[]) {
  if (!rows.length) return null
  const totalClicks      = rows.reduce((s, r) => s + r.clicks, 0)
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0)
  const avgCtr           = totalImpressions > 0 ? totalClicks / totalImpressions : 0
  // Weight avg position by impressions (more accurate than simple mean)
  const weightedPosSum = rows.reduce((s, r) => s + r.position * r.impressions, 0)
  const avgPosition    = totalImpressions > 0 ? weightedPosSum / totalImpressions : 0
  return { totalClicks, totalImpressions, avgCtr, avgPosition }
}

export function GSCKPIGrid({ rows, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
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

  const kpis = [
    {
      label: 'Total Clicks',
      value: fmtNumber(agg.totalClicks),
      icon:  MousePointerClick,
      color: 'text-emerald-400',
      description: `from organic search`,
    },
    {
      label: 'Impressions',
      value: fmtNumber(agg.totalImpressions),
      icon:  Eye,
      color: 'text-sky-400',
      description: `total SERP appearances`,
    },
    {
      label: 'Avg. CTR',
      value: fmtPercent(agg.avgCtr),
      icon:  Percent,
      color: 'text-violet-400',
      description: `clicks ÷ impressions`,
    },
    {
      label: 'Avg. Position',
      value: agg.avgPosition.toFixed(1),
      icon:  TrendingDown,
      color: 'text-amber-400',
      description: `lower is better`,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
            <span className="text-xs text-slate-500">{kpi.description}</span>
          </Card>
        )
      })}
    </div>
  )
}
