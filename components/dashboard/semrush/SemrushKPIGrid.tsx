'use client'

import { TrendingUp, Search, MousePointerClick, DollarSign, BarChart2, Megaphone } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtNumber, fmtCurrency } from '@/lib/utils'
import type { SemrushDomainOverview } from '@/lib/types'

interface Props {
  overview: SemrushDomainOverview | null
  loading: boolean
}

interface KPICardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent?: string
}

function KPICard({ icon, label, value, sub, accent }: KPICardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="rounded-lg bg-slate-800 p-2 text-slate-400">{icon}</div>
        <span className="text-xs text-slate-500 uppercase tracking-wide leading-tight">{label}</span>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${accent ?? 'text-slate-100'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </Card>
  )
}

function RankCard({ rank }: { rank: number }) {
  // Lower rank = better (rank 1 = most traffic globally)
  const label = rank === 0   ? '—'
              : rank < 1_000  ? 'Top 1K'
              : rank < 10_000 ? 'Top 10K'
              : rank < 100_000 ? 'Top 100K'
              : rank < 1_000_000 ? 'Top 1M'
              : 'Ranked'

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="rounded-lg bg-slate-800 p-2 text-slate-400"><BarChart2 size={16} /></div>
        <span className="text-xs text-slate-500 uppercase tracking-wide">Semrush Rank</span>
      </div>
      <p className="text-2xl font-bold tabular-nums text-slate-100">
        {rank > 0 ? `#${fmtNumber(rank)}` : '—'}
      </p>
      <p className="mt-1 text-xs text-slate-500">{label} globally</p>
    </Card>
  )
}

export function SemrushKPIGrid({ overview, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="mt-1 h-3 w-16" />
          </Card>
        ))}
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 p-8 text-center">
        <p className="text-2xl">📭</p>
        <p className="mt-2 text-sm text-slate-400">No data returned for this domain.</p>
        <p className="mt-1 text-xs text-slate-600">
          Check the domain spelling or try a different database.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <RankCard rank={overview.semrush_rank} />

      <KPICard
        icon={<Search size={16} />}
        label="Organic Keywords"
        value={fmtNumber(overview.organic_keywords)}
        sub="Ranking in top 100"
      />

      <KPICard
        icon={<MousePointerClick size={16} />}
        label="Organic Traffic"
        value={fmtNumber(overview.organic_traffic)}
        sub="Est. visits / month"
        accent="text-orange-400"
      />

      <KPICard
        icon={<DollarSign size={16} />}
        label="Traffic Value"
        value={overview.organic_cost > 0 ? fmtCurrency(overview.organic_cost) : '—'}
        sub="Organic cost equiv."
      />

      <KPICard
        icon={<Megaphone size={16} />}
        label="Paid Keywords"
        value={overview.paid_keywords > 0 ? fmtNumber(overview.paid_keywords) : '—'}
        sub={overview.paid_traffic > 0 ? `${fmtNumber(overview.paid_traffic)} visits` : 'No paid ads'}
      />

      <KPICard
        icon={<TrendingUp size={16} />}
        label="Paid Ad Spend"
        value={overview.paid_cost > 0 ? fmtCurrency(overview.paid_cost) : '—'}
        sub="Est. monthly spend"
      />
    </div>
  )
}
