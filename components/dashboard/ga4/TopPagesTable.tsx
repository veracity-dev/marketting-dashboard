'use client'

import { useState } from 'react'
import { ArrowUpDown, ExternalLink } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtNumber, fmtPercent, fmtDuration, cn } from '@/lib/utils'
import type { GATopPage } from '@/lib/types'

type SortKey = 'screen_page_views' | 'avg_session_duration' | 'engagement_rate' | 'bounce_rate'

interface Props {
  rows: GATopPage[]
  loading: boolean
}

function aggregatePages(rows: GATopPage[]): GATopPage[] {
  const map: Record<string, GATopPage & { count: number; bounce_sum: number; eng_sum: number; dur_sum: number }> = {}
  for (const r of rows) {
    if (!map[r.page_path]) {
      map[r.page_path] = { ...r, count: 0, bounce_sum: 0, eng_sum: 0, dur_sum: 0 }
    }
    const m = map[r.page_path]
    m.screen_page_views += r.screen_page_views
    m.bounce_sum += r.bounce_rate
    m.eng_sum += r.engagement_rate
    m.dur_sum += r.avg_session_duration
    m.count++
    if (!m.page_title && r.page_title) m.page_title = r.page_title
  }
  return Object.values(map).map((m) => ({
    ...m,
    bounce_rate:          m.bounce_sum  / m.count,
    engagement_rate:      m.eng_sum     / m.count,
    avg_session_duration: m.dur_sum     / m.count,
  }))
}

export function TopPagesTable({ rows, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('screen_page_views')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showAll, setShowAll] = useState(false)

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Top Pages</CardTitle></CardHeader>
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      </Card>
    )
  }

  const pages = aggregatePages(rows)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...pages].sort((a, b) => {
    const v = a[sortKey] - b[sortKey]
    return sortDir === 'asc' ? v : -v
  })

  const visible = showAll ? sorted : sorted.slice(0, 10)

  const cols: { key: SortKey; label: string; fmt: (v: number) => string }[] = [
    { key: 'screen_page_views',    label: 'Views',       fmt: fmtNumber },
    { key: 'avg_session_duration', label: 'Avg Time',    fmt: fmtDuration },
    { key: 'engagement_rate',      label: 'Engagement',  fmt: fmtPercent },
    { key: 'bounce_rate',          label: 'Bounce',      fmt: fmtPercent },
  ]

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Top Pages</CardTitle>
        <span className="text-xs text-slate-500">{pages.length} unique pages</span>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="pb-2 text-left font-medium text-slate-500 pr-4">Page</th>
              {cols.map((c) => (
                <th key={c.key} className="pb-2 text-right">
                  <button
                    onClick={() => toggleSort(c.key)}
                    className={cn(
                      'inline-flex items-center gap-1 font-medium transition-colors hover:text-slate-200',
                      sortKey === c.key ? 'text-indigo-400' : 'text-slate-500'
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
            {visible.map((page) => (
              <tr key={page.page_path} className="group hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 pr-4">
                  <div className="flex items-start gap-1">
                    <div>
                      <p className="max-w-[220px] truncate font-medium text-slate-300 group-hover:text-slate-100">
                        {page.page_title || page.page_path}
                      </p>
                      <p className="max-w-[220px] truncate text-slate-600 mt-0.5">
                        {page.page_path}
                      </p>
                    </div>
                  </div>
                </td>
                {cols.map((c) => (
                  <td key={c.key} className="py-2.5 text-right tabular-nums text-slate-400">
                    {c.fmt(page[c.key] as number)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages.length > 10 && (
        <button
          onClick={() => setShowAll((s) => !s)}
          className="mt-3 w-full rounded-lg py-2 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        >
          {showAll ? 'Show less' : `Show all ${pages.length} pages`}
        </button>
      )}
    </Card>
  )
}
