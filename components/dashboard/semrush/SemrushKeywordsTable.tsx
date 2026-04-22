'use client'

import { useState } from 'react'
import { ArrowUpDown, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtNumber, cn } from '@/lib/utils'
import type { SemrushKeyword } from '@/lib/types'

type SortKey = 'position' | 'volume' | 'cpc' | 'traffic_pct'

interface Props {
  keywords: SemrushKeyword[]
  loading: boolean
}

function positionColor(pos: number): string {
  if (pos <= 3)  return 'text-emerald-400'
  if (pos <= 10) return 'text-orange-400'
  if (pos <= 20) return 'text-yellow-400'
  return 'text-slate-500'
}

function PositionTrend({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) {
    return <span className="text-[10px] text-slate-700">new</span>
  }
  const diff = previous - current  // positive = improved (lower position number is better)
  if (diff > 0) return <span className="flex items-center gap-0.5 text-emerald-400 text-[10px]"><TrendingUp size={9} />+{diff}</span>
  if (diff < 0) return <span className="flex items-center gap-0.5 text-red-400 text-[10px]"><TrendingDown size={9} />{diff}</span>
  return <span className="text-slate-600 text-[10px]"><Minus size={9} /></span>
}

export function SemrushKeywordsTable({ keywords, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('position')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [showAll, setShowAll] = useState(false)

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Top Organic Keywords</CardTitle></CardHeader>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      </Card>
    )
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir(key === 'position' ? 'asc' : 'desc') }
  }

  const sorted = [...keywords].sort((a, b) => {
    const v = a[sortKey] - b[sortKey]
    return sortDir === 'asc' ? v : -v
  })

  const visible = showAll ? sorted : sorted.slice(0, 15)

  const cols: { key: SortKey; label: string; fmt: (v: number) => string }[] = [
    { key: 'position',    label: 'Pos',      fmt: (v) => String(v)              },
    { key: 'volume',      label: 'Volume',   fmt: fmtNumber                     },
    { key: 'cpc',         label: 'CPC',      fmt: (v) => `$${v.toFixed(2)}`     },
    { key: 'traffic_pct', label: 'Traffic%', fmt: (v) => `${v.toFixed(1)}%`    },
  ]

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Top Organic Keywords</CardTitle>
        <span className="text-xs text-slate-500">{keywords.length} keywords found</span>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="pb-2 text-left font-medium text-slate-500 pr-4">Keyword</th>
              <th className="pb-2 text-left font-medium text-slate-500 pr-4">URL</th>
              {cols.map((c) => (
                <th key={c.key} className="pb-2 text-right">
                  <button
                    onClick={() => toggleSort(c.key)}
                    className={cn(
                      'inline-flex items-center gap-1 font-medium transition-colors hover:text-slate-200',
                      sortKey === c.key ? 'text-orange-400' : 'text-slate-500'
                    )}
                  >
                    {c.label}
                    <ArrowUpDown size={10} />
                  </button>
                </th>
              ))}
              <th className="pb-2 text-right font-medium text-slate-500">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {visible.map((kw, idx) => {
              let shortUrl = kw.url
              try { shortUrl = new URL(kw.url).pathname || '/' } catch {}
              return (
                <tr key={`${kw.keyword}-${idx}`} className="group hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 pr-4">
                    <p className="max-w-[200px] truncate font-medium text-slate-300 group-hover:text-slate-100">
                      {kw.keyword}
                    </p>
                  </td>
                  <td className="py-2.5 pr-4">
                    <p className="max-w-[160px] truncate text-slate-600 group-hover:text-slate-500">
                      {shortUrl}
                    </p>
                  </td>
                  {cols.map((c) => (
                    <td key={c.key} className="py-2.5 text-right tabular-nums">
                      <span className={c.key === 'position' ? positionColor(kw.position) : 'text-slate-400'}>
                        {c.fmt(kw[c.key])}
                      </span>
                    </td>
                  ))}
                  <td className="py-2.5 text-right">
                    <PositionTrend current={kw.position} previous={kw.previous_position} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {keywords.length > 15 && (
        <button
          onClick={() => setShowAll((s) => !s)}
          className="mt-3 w-full rounded-lg py-2 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        >
          {showAll ? 'Show less' : `Show all ${keywords.length} keywords`}
        </button>
      )}

      {keywords.length === 0 && (
        <p className="py-8 text-center text-xs text-slate-600">No ranking keywords found for this domain.</p>
      )}
    </Card>
  )
}
