'use client'

import { DollarSign, ShoppingCart, TrendingUp, BarChart } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtCurrency, fmtNumber, fmtPercent } from '@/lib/utils'
import type { GAEcommerce } from '@/lib/types'

interface Props {
  rows: GAEcommerce[]
  loading: boolean
}

export function EcommerceSection({ rows, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><Skeleton className="mb-3 h-4 w-20" /><Skeleton className="h-8 w-24" /></Card>
        ))}
      </div>
    )
  }

  // Only render if there's meaningful ecommerce data
  const hasRevenue = rows.some((r) => r.total_revenue > 0)
  if (!rows.length || !hasRevenue) return null

  const totals = rows.reduce(
    (acc, r) => ({
      revenue:         acc.revenue + r.total_revenue,
      transactions:    acc.transactions + r.transactions,
      conv_rate_sum:   acc.conv_rate_sum + r.session_conversion_rate,
      ptv_rate_sum:    acc.ptv_rate_sum + r.purchase_to_view_rate,
    }),
    { revenue: 0, transactions: 0, conv_rate_sum: 0, ptv_rate_sum: 0 }
  )
  const n = rows.length
  const aov = totals.transactions > 0 ? totals.revenue / totals.transactions : 0

  const metrics = [
    {
      label: 'Revenue',
      value: fmtCurrency(totals.revenue),
      sub: `${fmtNumber(totals.transactions)} transactions`,
      icon: DollarSign,
      color: 'text-emerald-400',
    },
    {
      label: 'Avg. Order Value',
      value: fmtCurrency(aov),
      sub: 'per transaction',
      icon: ShoppingCart,
      color: 'text-cyan-400',
    },
    {
      label: 'Conv. Rate',
      value: fmtPercent(totals.conv_rate_sum / n),
      sub: 'sessions → purchase',
      icon: TrendingUp,
      color: 'text-indigo-400',
    },
    {
      label: 'Purchase-to-View',
      value: fmtPercent(totals.ptv_rate_sum / n),
      sub: 'view → purchase',
      icon: BarChart,
      color: 'text-violet-400',
    },
  ]

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
        <DollarSign size={12} />
        E-commerce
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon
          return (
            <Card key={m.label} className="hover:border-slate-700 transition-colors">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{m.label}</span>
                <div className={`rounded-lg bg-slate-800 p-1.5 ${m.color}`}><Icon size={14} /></div>
              </div>
              <div className="mb-1 text-2xl font-bold text-slate-100 tabular-nums">{m.value}</div>
              <p className="text-xs text-slate-500">{m.sub}</p>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
