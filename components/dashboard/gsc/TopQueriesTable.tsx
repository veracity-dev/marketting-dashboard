'use client'

import { useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtNumber, fmtPercent, cn } from '@/lib/utils'
import type { GSCQuery } from '@/lib/types'

type SortKey = 'clicks' | 'impressions' | 'ctr' | 'position'

interface Props {
  rows: GSCQuery[]
  loading: boolean
}

function aggregateQueries(rows: GSCQuery[]) {
  const map: Record<string, { query: string; clicks: number; impressions: number; pos_weighted: number }> = {}
  for (const r of rows) {
    if (!map[r.query]) map[r.query] = { query: r.query, clicks: 0, impressions: 0, pos_weighted: 0 }
    const m = map[r.query]
    m.clicks      += r.clicks
    m.impressions += r.impressions
    m.pos_weighted += r.position * r.impressions
  }
  return Object.values(map).map((m) => ({
    query:       m.query,
    clicks:      m.clicks,
    impressions: m.impressions,
    ctr:         m.impressions > 0 ? m.clicks / m.impressions : 0,
    position:    m.impressions > 0 ? m.pos_weighted / m.impressions : 0,
  }))
}

export function TopQueriesTable({ rows, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('clicks')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showAll, setShowAll] = useState(false)

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Top Search Queries</CardTitle></CardHeader>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      </Card>
    )
  }

  const queries = aggregateQueries(rows)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir(key === 'position' ? 'asc' : 'desc') }
  }

  const sorted = [...queries].sort((a, b) => {
    const v = a[sortKey] - b[sortKey]
    return sortDir === 'asc' ? v : -v
  })

  const visible = showAll ? sorted : sorted.slice(0, 10)

  const cols: { key: SortKey; label: string; fmt: (v: number) => string }[] = [
    { key: 'clicks',      label: 'Clicks',      fmt: fmtNumber },
    { key: 'impressions', label: 'Impressions', fmt: fmtNumber },
    { key: 'ctr',         label: 'CTR',         fmt: fmtPercent },
    { key: 'position',    label: 'Position',    fmt: (v) => v.toFixed(1) },
  ]

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Top Search Queries</CardTitle>
        <span className="text-xs text-slate-500">{queries.length} unique queries</span>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="pb-2 text-left font-medium text-slate-500 pr-4">Query</th>
              {cols.map((c) => (
                <th key={c.key} className="pb-2 text-right">
                  <button
                    onClick={() => toggleSort(c.key)}
                    className={cn(
                      'inline-flex items-center gap-1 font-medium transition-colors hover:text-slate-200',
                      sortKey === c.key ? 'text-emerald-400' : 'text-slate-500'
                    )}
                  >
                    {c.label}
                    <ArrowUpDown size={10} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {visible.map((q) => (
              <tr key={q.query} className="group hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 pr-4">
                  <p className="max-w-[280px] truncate font-medium text-slate-300 group-hover:text-slate-100">
                    {q.query || '(not provided)'}
                  </p>
                </td>
                {cols.map((c) => (
                  <td key={c.key} className="py-2.5 text-right tabular-nums text-slate-400">
                    {c.fmt((q as any)[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {queries.length > 10 && (
        <button
          onClick={() => setShowAll((s) => !s)}
          className="mt-3 w-full rounded-lg py-2 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        >
          {showAll ? 'Show less' : `Show all ${queries.length} queries`}
        </button>
      )}
    </Card>
  )
}
