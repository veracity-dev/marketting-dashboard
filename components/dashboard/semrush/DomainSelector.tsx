'use client'

import { useState, useEffect } from 'react'
import { Globe, Plus, X, RefreshCw, AlertTriangle, Search, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { SemrushProject } from '@/lib/types'

const LOCAL_KEY = 'smrush_extra_domains'

const DATABASES = [
  { code: 'us', flag: '🇺🇸', label: 'US' },
  { code: 'uk', flag: '🇬🇧', label: 'UK' },
  { code: 'ca', flag: '🇨🇦', label: 'CA' },
  { code: 'au', flag: '🇦🇺', label: 'AU' },
  { code: 'de', flag: '🇩🇪', label: 'DE' },
  { code: 'fr', flag: '🇫🇷', label: 'FR' },
  { code: 'es', flag: '🇪🇸', label: 'ES' },
  { code: 'it', flag: '🇮🇹', label: 'IT' },
  { code: 'nl', flag: '🇳🇱', label: 'NL' },
  { code: 'br', flag: '🇧🇷', label: 'BR' },
  { code: 'in', flag: '🇮🇳', label: 'IN' },
  { code: 'sg', flag: '🇸🇬', label: 'SG' },
  { code: 'ae', flag: '🇦🇪', label: 'AE' },
  { code: 'ph', flag: '🇵🇭', label: 'PH' },
]

interface UnitsData {
  analyticsUnits: number | null
  backlinksUnits: 'ok' | 'zero' | 'unknown'
}

interface Props {
  projects: SemrushProject[]
  projectsLoading: boolean
  projectsError: string | null
  selected: string | null
  database: string
  onSelect: (domain: string) => void
  onDatabaseChange: (db: string) => void
  onRefetchProjects: () => void
}

export function DomainSelector({
  projects,
  projectsLoading,
  projectsError,
  selected,
  database,
  onSelect,
  onDatabaseChange,
  onRefetchProjects,
}: Props) {
  const [extraDomains, setExtraDomains] = useState<string[]>([])
  const [input,        setInput]        = useState('')
  const [showInput,    setShowInput]    = useState(true)
  const [units,        setUnits]        = useState<UnitsData | null>(null)
  const [unitsLoading, setUnitsLoading] = useState(false)

  // Hydrate extra domains from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_KEY)
      if (saved) setExtraDomains(JSON.parse(saved))
    } catch {}
  }, [])

  // Fetch API unit balance once on mount
  useEffect(() => {
    setUnitsLoading(true)
    fetch('/api/semrush/units')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setUnits(d) })
      .catch(() => {})
      .finally(() => setUnitsLoading(false))
  }, [])

  function persistExtra(domains: string[]) {
    setExtraDomains(domains)
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(domains)) } catch {}
  }

  function addDomain() {
    const d = input.trim().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase()
    if (!d) return
    const alreadyInProjects = projects.some((p) => p.domain === d)
    const alreadyExtra      = extraDomains.includes(d)
    if (!alreadyInProjects && !alreadyExtra) {
      persistExtra([...extraDomains, d])
    }
    setInput('')
    setShowInput(false)
    onSelect(d)
  }

  function removeDomain(d: string) {
    const next = extraDomains.filter((x) => x !== d)
    persistExtra(next)
    if (selected === d) onSelect(projects[0]?.domain ?? next[0] ?? '')
  }

  const projectDomains = projects.map((p) => ({ domain: p.domain, name: p.name, isProject: true }))
  const extraItems     = extraDomains
    .filter((d) => !projects.some((p) => p.domain === d))
    .map((d) => ({ domain: d, name: d, isProject: false }))
  const allItems = [...projectDomains, ...extraItems]

  return (
    <div className="w-60 flex-shrink-0">
      <div className="sticky top-24 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Globe size={12} className="text-slate-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Domains</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowInput((v) => !v)}
              title="Add domain manually"
              className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-orange-400 transition-colors"
            >
              <Plus size={12} />
            </button>
            <button
              onClick={onRefetchProjects}
              title="Reload projects from Semrush"
              className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
            >
              <RefreshCw size={10} />
            </button>
          </div>
        </div>

        {/* Database selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-600">Database</span>
          <select
            value={database}
            onChange={(e) => onDatabaseChange(e.target.value)}
            className="flex-1 rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
          >
            {DATABASES.map((db) => (
              <option key={db.code} value={db.code}>{db.flag} {db.label}</option>
            ))}
          </select>
        </div>

        {/* Manual domain input */}
        {showInput && (
          <div className="flex gap-1">
            <div className="relative flex-1">
              <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')  addDomain()
                  if (e.key === 'Escape') setShowInput(false)
                }}
                placeholder="example.com"
                className="w-full rounded-md border border-slate-700 bg-slate-800 pl-6 pr-2 py-1.5 text-[11px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60"
              />
            </div>
            <button
              onClick={addDomain}
              className="rounded-md bg-orange-600/20 px-2 py-1 text-[11px] text-orange-400 hover:bg-orange-600/30 transition-colors"
            >
              Add
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {projectsLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}
          </div>
        )}

        {/* Projects API error */}
        {!projectsLoading && projectsError && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0 text-amber-400" />
              <p className="text-[11px] leading-relaxed text-amber-300">
                Could not load Semrush projects. Add domains manually above.
              </p>
            </div>
          </div>
        )}

        {/* Management API note */}
        {!projectsLoading && projects.length === 0 && !projectsError && (
          <p className="text-[10px] leading-relaxed text-slate-700">
            Project list requires Semrush Management API (not in Standard plan).{' '}
            <span className="text-slate-600">Add domains manually above.</span>
          </p>
        )}

        {/* Domain list */}
        {!projectsLoading && allItems.length > 0 && (
          <div className="space-y-1">
            {allItems.map((item) => {
              const isSelected = item.domain === selected
              return (
                <button
                  key={item.domain}
                  onClick={() => onSelect(item.domain)}
                  className={cn(
                    'group relative w-full rounded-lg border px-3 py-2.5 text-left transition-all',
                    isSelected
                      ? 'border-orange-500/40 bg-orange-500/10'
                      : 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800/60'
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className={cn(
                        'truncate text-xs font-medium leading-snug',
                        isSelected ? 'text-orange-300' : 'text-slate-300 group-hover:text-slate-100'
                      )}>
                        {item.domain}
                      </p>
                      {item.isProject && item.name !== item.domain && (
                        <p className="mt-0.5 truncate text-[10px] text-slate-600">{item.name}</p>
                      )}
                      {!item.isProject && (
                        <p className="mt-0.5 text-[10px] text-slate-700">Manual</p>
                      )}
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-1">
                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />}
                      {!item.isProject && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeDomain(item.domain) }}
                          className="rounded p-0.5 text-slate-700 hover:text-red-400 transition-colors"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* ── API Units widget ──────────────────────────────────────── */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Zap size={11} className="text-slate-500" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">API Balance</span>
          </div>

          {unitsLoading ? (
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ) : !units ? (
            <p className="text-[10px] text-slate-700">Could not fetch balance</p>
          ) : (
            <div className="space-y-1.5">
              {/* Analytics API units */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-600">Analytics</span>
                {units.analyticsUnits !== null ? (
                  <span className={cn(
                    'text-[10px] font-medium tabular-nums',
                    units.analyticsUnits > 5000  ? 'text-emerald-400' :
                    units.analyticsUnits > 1000  ? 'text-yellow-400'  : 'text-red-400'
                  )}>
                    {units.analyticsUnits.toLocaleString()} units
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-700">N/A on plan</span>
                )}
              </div>

              {/* Backlinks API status */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-600">Backlinks</span>
                {units.backlinksUnits === 'ok' && (
                  <span className="text-[10px] font-medium text-emerald-400">● Active</span>
                )}
                {units.backlinksUnits === 'zero' && (
                  <span className="text-[10px] font-medium text-red-400">● Exhausted</span>
                )}
                {units.backlinksUnits === 'unknown' && (
                  <span className="text-[10px] text-slate-600">Unknown</span>
                )}
              </div>
            </div>
          )}

          {/* Warn if backlinks are zero */}
          {units?.backlinksUnits === 'zero' && (
            <p className="mt-2 text-[9px] leading-relaxed text-red-500/80">
              Backlinks data cannot be fetched until units are topped up.{' '}
              <a
                href="https://www.semrush.com/accounts/subscription-info/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-red-400"
              >
                Buy units →
              </a>
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
