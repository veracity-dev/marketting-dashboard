'use client'

import { Globe, RefreshCw, Clock, AlertTriangle } from 'lucide-react'
import { cn, fmtRelativeTime } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { GSCSite } from '@/lib/types'

interface Props {
  sites: GSCSite[]
  selected: string | null
  onSelect: (site: GSCSite) => void
  loading: boolean
  refreshing: boolean
  error?: string | null
  onRefreshList: () => void
  refreshingSiteUrl?: string | null
}

export function SiteSelector({
  sites,
  selected,
  onSelect,
  loading,
  refreshing,
  error,
  onRefreshList,
  refreshingSiteUrl,
}: Props) {
  return (
    <div className="w-60 flex-shrink-0">
      <div className="sticky top-24 space-y-3">

        {/* Header + refresh list button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Globe size={12} className="text-slate-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Sites
            </span>
          </div>
          <button
            onClick={onRefreshList}
            disabled={refreshing}
            title="Fetch fresh list from Google Search Console"
            className={cn(
              'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-slate-500 transition-colors',
              refreshing
                ? 'cursor-not-allowed'
                : 'hover:bg-slate-800 hover:text-slate-300'
            )}
          >
            <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>

        {loading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0 text-amber-400" />
              <p className="text-[11px] leading-relaxed text-amber-300">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && sites.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-800 p-3 text-center">
            <p className="text-xs text-slate-500">No sites yet.</p>
            <p className="mt-1 text-[10px] text-slate-600 leading-relaxed">
              Click <span className="text-slate-400">Sync</span> to fetch your verified sites from Google Search Console.
            </p>
          </div>
        )}

        {!loading && sites.length > 0 && (
          <div className="space-y-1">
            {sites.map((s) => {
              const isSelected   = s.site_url === selected
              const isRefreshing = s.site_url === refreshingSiteUrl
              return (
                <button
                  key={s.site_url}
                  onClick={() => onSelect(s)}
                  className={cn(
                    'group w-full rounded-lg border px-3 py-2.5 text-left transition-all',
                    isSelected
                      ? 'border-emerald-500/40 bg-emerald-600/10'
                      : 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800/60'
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className={cn(
                      'truncate text-xs font-medium leading-snug',
                      isSelected
                        ? 'text-emerald-300'
                        : 'text-slate-300 group-hover:text-slate-100'
                    )}>
                      {s.site_url.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '')}
                    </p>
                    {isRefreshing ? (
                      <RefreshCw size={10} className="mt-0.5 flex-shrink-0 animate-spin text-emerald-400" />
                    ) : isSelected ? (
                      <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                    ) : null}
                  </div>
                  {s.permission_level && (
                    <p className="mt-0.5 text-[10px] text-slate-600">
                      {s.permission_level.replace('siteFull', 'Owner').replace('siteRestricted', 'Restricted')}
                    </p>
                  )}
                  {s.last_synced && (
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-600">
                      <Clock size={8} />
                      {fmtRelativeTime(s.last_synced)}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
