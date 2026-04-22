'use client'

import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtNumber } from '@/lib/utils'
import type { SemrushKeyword } from '@/lib/types'

interface Props {
  keywords: SemrushKeyword[]
  loading: boolean
}

interface Bucket {
  label: string
  count: number
  color: string
}

function buildBuckets(keywords: SemrushKeyword[]): Bucket[] {
  const buckets: Bucket[] = [
    { label: 'Top 3',  count: 0, color: '#34d399' },
    { label: '4–10',   count: 0, color: '#fb923c' },
    { label: '11–20',  count: 0, color: '#facc15' },
    { label: '21–50',  count: 0, color: '#f87171' },
    { label: '51–100', count: 0, color: '#94a3b8' },
  ]

  for (const kw of keywords) {
    const p = kw.position
    if      (p <= 3)   buckets[0].count++
    else if (p <= 10)  buckets[1].count++
    else if (p <= 20)  buckets[2].count++
    else if (p <= 50)  buckets[3].count++
    else               buckets[4].count++
  }

  return buckets
}

export function SemrushPositionChart({ keywords, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keyword Position Distribution</CardTitle>
        </CardHeader>
        <Skeleton className="h-40 w-full" />
      </Card>
    )
  }

  const buckets = buildBuckets(keywords)
  const total   = buckets.reduce((s, b) => s + b.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Keyword Position Distribution</CardTitle>
        <span className="text-xs text-slate-500">{fmtNumber(total)} keywords tracked</span>
      </CardHeader>

      <div className="space-y-2.5">
        {buckets.map((b) => {
          const pct = total > 0 ? (b.count / total) * 100 : 0
          return (
            <div key={b.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">{b.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 tabular-nums">{fmtNumber(b.count)}</span>
                  <span className="w-10 text-right text-slate-400 tabular-nums">{pct.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: b.color }}
                />
              </div>
            </div>
          )
        })}
      </div>

    </Card>
  )
}
