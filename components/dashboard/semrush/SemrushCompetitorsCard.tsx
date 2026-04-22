'use client'

import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtNumber, fmtCurrency, CHART_COLORS } from '@/lib/utils'
import type { SemrushCompetitor } from '@/lib/types'

interface Props {
  competitors: SemrushCompetitor[]
  loading: boolean
}

export function SemrushCompetitorsCard({ competitors, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Organic Competitors</CardTitle></CardHeader>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </Card>
    )
  }

  const maxTraffic = Math.max(...competitors.map((c) => c.organic_traffic), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organic Competitors</CardTitle>
        <span className="text-xs text-slate-500">by keyword overlap</span>
      </CardHeader>

      {competitors.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-600">No competitor data available.</p>
      ) : (
        <div className="space-y-3">
          {competitors.map((c, i) => {
            const trafficPct = (c.organic_traffic / maxTraffic) * 100
            const relPct     = Math.round(c.relevance * 100)
            return (
              <div key={c.domain}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-600 tabular-nums w-4 text-right">{i + 1}</span>
                    <span className="font-medium text-slate-300 truncate">{c.domain}</span>
                    <span className="flex-shrink-0 rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">
                      {relPct}% overlap
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <span className="text-slate-500 tabular-nums">{fmtNumber(c.common_keywords)} kws</span>
                    <span className="text-orange-400 tabular-nums">{fmtNumber(c.organic_traffic)}</span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-1.5 rounded-full transition-all duration-700"
                    style={{
                      width: `${trafficPct}%`,
                      backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-4 text-[10px] text-slate-700">
        Traffic column shows estimated organic visits/month.
      </p>
    </Card>
  )
}
