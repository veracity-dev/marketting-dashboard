'use client'

import { Building2, RefreshCw, Clock, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { cn, fmtRelativeTime } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { GAProperty } from '@/lib/types'

interface Props {
  properties: GAProperty[]
  selected: string | null
  onSelect: (property: GAProperty) => void
  loading: boolean
  error?: string | null
  refreshingPropertyId?: string | null
}

// Group properties by account
function groupByAccount(properties: GAProperty[]) {
  const map: Record<string, { account_name: string; items: GAProperty[] }> = {}
  for (const p of properties) {
    const key = p.account_id || 'unknown'
    if (!map[key]) map[key] = { account_name: p.account_name || 'Unknown Account', items: [] }
    map[key].items.push(p)
  }
  return Object.entries(map).map(([id, val]) => ({ account_id: id, ...val }))
}

export function PropertySelector({
  properties,
  selected,
  onSelect,
  loading,
  error,
  refreshingPropertyId,
}: Props) {
  const [collapsedAccounts, setCollapsedAccounts] = useState<Set<string>>(new Set())

  function toggleAccount(accountId: string) {
    setCollapsedAccounts((prev) => {
      const next = new Set(prev)
      next.has(accountId) ? next.delete(accountId) : next.add(accountId)
      return next
    })
  }

  const groups = groupByAccount(properties)

  return (
    <div className="w-56 flex-shrink-0">
      <div className="sticky top-24 space-y-3">

        {/* Header */}
        <div className="flex items-center gap-1.5">
          <Building2 size={12} className="text-slate-500" />
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Properties
          </span>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded" />
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        )}

        {/* Config / API error */}
        {!loading && error && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0 text-amber-400" />
              <p className="text-[11px] leading-relaxed text-amber-300">{error}</p>
            </div>
          </div>
        )}

        {/* No properties returned (service account has no GA access yet) */}
        {!loading && !error && properties.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-800 p-3 text-center">
            <p className="text-xs text-slate-500">No GA4 properties found.</p>
            <p className="mt-1 text-[10px] text-slate-600 leading-relaxed">
              Make sure the service account email is added as a Viewer in your GA4 property settings.
            </p>
          </div>
        )}

        {/* Property list — grouped by account */}
        {!loading && groups.length > 0 && (
          <div className="space-y-3">
            {groups.map((group) => {
              const collapsed = collapsedAccounts.has(group.account_id)
              return (
                <div key={group.account_id}>
                  {/* Account header — only shown when multiple accounts exist */}
                  {groups.length > 1 && (
                    <button
                      onClick={() => toggleAccount(group.account_id)}
                      className="mb-1 flex w-full items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      {collapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                      <span className="truncate">{group.account_name}</span>
                    </button>
                  )}

                  {!collapsed && (
                    <div className="space-y-1">
                      {group.items.map((p) => {
                        const isSelected   = p.property_id === selected
                        const isRefreshing = p.property_id === refreshingPropertyId
                        return (
                          <button
                            key={p.property_id}
                            onClick={() => onSelect(p)}
                            className={cn(
                              'group w-full rounded-lg border px-3 py-2.5 text-left transition-all',
                              isSelected
                                ? 'border-indigo-500/40 bg-indigo-600/10'
                                : 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800/60'
                            )}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <p className={cn(
                                'text-xs font-medium leading-snug',
                                isSelected
                                  ? 'text-indigo-300'
                                  : 'text-slate-300 group-hover:text-slate-100'
                              )}>
                                {p.display_name}
                              </p>
                              {isRefreshing ? (
                                <RefreshCw size={10} className="mt-0.5 flex-shrink-0 animate-spin text-indigo-400" />
                              ) : isSelected ? (
                                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                              ) : null}
                            </div>
                            <p className="mt-0.5 font-mono text-[10px] text-slate-600">
                              {p.property_id}
                            </p>
                            {p.last_synced && (
                              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-600">
                                <Clock size={8} />
                                {fmtRelativeTime(p.last_synced)}
                              </p>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
