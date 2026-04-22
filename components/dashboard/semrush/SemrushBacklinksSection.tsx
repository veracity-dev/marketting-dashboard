'use client'

import { AlertCircle, ExternalLink, ShieldAlert, XCircle, AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtNumber, fmtPercent, CHART_COLORS } from '@/lib/utils'
import type { SemrushBacklinksData } from '@/lib/types'

interface Props {
  data: SemrushBacklinksData | null
  loading: boolean
  error: string | null
  domain: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function authorityGrade(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: '#34d399' }
  if (score >= 60) return { label: 'Strong',    color: '#4ade80' }
  if (score >= 40) return { label: 'Good',      color: '#fb923c' }
  if (score >= 20) return { label: 'Average',   color: '#facc15' }
  return                   { label: 'Weak',     color: '#f87171' }
}

/** Convert a Unix epoch seconds string (from Semrush) to a readable date. */
function fmtUnixDate(epochStr: string): string {
  if (!epochStr || epochStr === '0') return '—'
  const ts = Number(epochStr)
  if (!ts || isNaN(ts)) return '—'
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function truncateUrl(url: string, max = 55): string {
  if (url.length <= max) return url
  return url.slice(0, max) + '…'
}

// ── Error banners ─────────────────────────────────────────────────────────────

interface ErrorBannerProps { domain: string; error: string; error_message?: string }

function ErrorBanner({ domain, error, error_message }: ErrorBannerProps) {
  if (error === 'zero_units') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-5">
        <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-amber-400" />
        <div className="space-y-1.5">
          <p className="font-semibold text-amber-300">Backlinks API units exhausted</p>
          <p className="text-xs leading-relaxed text-amber-400/80">
            Your Semrush plan includes Backlinks API access but the unit balance is currently zero.
            Each full backlinks refresh for <strong className="text-amber-300">{domain}</strong> costs
            approximately <strong className="text-amber-300">~480 API units</strong> (6 parallel calls × top results).
            Top up your balance and refresh.
          </p>
          {error_message && (
            <pre className="mt-2 rounded bg-amber-900/30 px-3 py-1.5 text-[10px] font-mono text-amber-500/80 overflow-x-auto">
              {error_message}
            </pre>
          )}
          <a
            href="https://www.semrush.com/accounts/subscription-info/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 underline hover:text-amber-300"
          >
            Buy API units <ExternalLink size={11} />
          </a>
        </div>
      </div>
    )
  }

  if (error === 'no_access') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-5">
        <ShieldAlert size={18} className="mt-0.5 flex-shrink-0 text-red-400" />
        <div className="space-y-1.5">
          <p className="font-semibold text-red-300">Access forbidden — Backlinks API not enabled</p>
          <p className="text-xs leading-relaxed text-red-400/80">
            Your API key does not have access to the Backlinks API (analytics/v1).
            This endpoint requires a Semrush subscription that includes the Backlinks add-on.
            Contact Semrush support or upgrade your plan.
          </p>
          {error_message && (
            <pre className="mt-2 rounded bg-red-900/30 px-3 py-1.5 text-[10px] font-mono text-red-500/80 overflow-x-auto">
              {error_message}
            </pre>
          )}
          <a
            href="https://www.semrush.com/kb/1083-backlinks-api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-red-400 underline hover:text-red-300"
          >
            Backlinks API docs <ExternalLink size={11} />
          </a>
        </div>
      </div>
    )
  }

  if (error === 'invalid_domain') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-5">
        <XCircle size={18} className="mt-0.5 flex-shrink-0 text-yellow-400" />
        <div className="space-y-1.5">
          <p className="font-semibold text-yellow-300">Invalid domain</p>
          <p className="text-xs leading-relaxed text-yellow-400/80">
            Semrush rejected <strong className="text-yellow-300">{domain}</strong> as invalid.
            Make sure you've entered a clean root domain without <code>http://</code> or path segments.
          </p>
          {error_message && (
            <pre className="mt-2 rounded bg-yellow-900/30 px-3 py-1.5 text-[10px] font-mono text-yellow-500/80 overflow-x-auto">
              {error_message}
            </pre>
          )}
        </div>
      </div>
    )
  }

  // Generic / api_error
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-5">
      <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-400" />
      <div className="space-y-1.5">
        <p className="font-semibold text-red-300">Semrush API error</p>
        <p className="text-xs text-red-400/80">
          The Backlinks API returned an error for <strong className="text-red-300">{domain}</strong>.
          This may be a temporary issue — wait a moment and try again.
        </p>
        {error_message && (
          <pre className="mt-2 rounded bg-red-900/30 px-3 py-1.5 text-[10px] font-mono text-red-500/80 overflow-x-auto">
            {error_message}
          </pre>
        )}
      </div>
    </div>
  )
}

// ── Overview KPI strip ────────────────────────────────────────────────────────

function OverviewKPIs({ ov }: { ov: SemrushBacklinksData['overview'] }) {
  if (!ov) return null
  const { label, color } = authorityGrade(ov.authority_score)
  const total           = ov.follows_num + ov.nofollows_num
  const followPct       = total > 0 ? ov.follows_num / total : null
  const textPct         = ov.total > 0 ? ov.texts_num / ov.total : null

  const kpis = [
    {
      label: 'Authority Score',
      value: String(ov.authority_score),
      sub: label,
      valueColor: color,
      bar: { pct: ov.authority_score, color },
    },
    { label: 'Total Backlinks',   value: fmtNumber(ov.total),         sub: `${fmtNumber(ov.urls_num)} unique URLs` },
    { label: 'Referring Domains', value: fmtNumber(ov.domains_num),   sub: `${fmtNumber(ov.ips_num)} unique IPs`   },
    {
      label: 'Dofollow Links',
      value: fmtNumber(ov.follows_num),
      sub: followPct !== null ? `${fmtPercent(followPct)} of all links` : 'of all links',
    },
    {
      label: 'Nofollow Links',
      value: fmtNumber(ov.nofollows_num),
      sub: followPct !== null ? `${fmtPercent(1 - followPct)} of all links` : 'of all links',
    },
    {
      label: 'Text Links',
      value: fmtNumber(ov.texts_num),
      sub: textPct !== null ? `${fmtPercent(textPct)} of total` : `${fmtNumber(ov.images_num)} image links`,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {kpis.map((k) => (
        <Card key={k.label} className="p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">{k.label}</p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: k.valueColor ?? '#f1f5f9' }}>
            {k.value}
          </p>
          {k.bar && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-1 rounded-full transition-all"
                style={{ width: `${k.bar.pct}%`, backgroundColor: k.bar.color }}
              />
            </div>
          )}
          <p className="mt-1 text-[10px] text-slate-500">{k.sub}</p>
        </Card>
      ))}
    </div>
  )
}

// ── Referring Domains table ───────────────────────────────────────────────────

function RefDomainsTable({ rows }: { rows: SemrushBacklinksData['ref_domains'] }) {
  if (rows.length === 0) return null
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Top Referring Domains</CardTitle>
        <span className="text-xs text-slate-500">{rows.length} shown · sorted by link count</span>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="pb-2 pl-3 text-left font-medium">#</th>
              <th className="pb-2 pl-2 text-left font-medium">Domain</th>
              <th className="pb-2 pr-3 text-right font-medium">Score</th>
              <th className="pb-2 pr-3 text-right font-medium">Links</th>
              <th className="pb-2 pr-3 text-right font-medium">Dofollow</th>
              <th className="pb-2 pr-3 text-right font-medium">Country</th>
              <th className="pb-2 pr-3 text-right font-medium">First Seen</th>
              <th className="pb-2 pr-3 text-right font-medium">Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.map((d, i) => {
              const { color } = authorityGrade(d.authority_score)
              const hasFollowData = d.follows_num > 0 || d.nofollows_num > 0
              const followPct     = hasFollowData ? d.follows_num / (d.follows_num + d.nofollows_num) : null
              return (
                <tr key={d.domain} className="group hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 pl-3 text-slate-600 tabular-nums">{i + 1}</td>
                  <td className="py-2 pl-2 pr-3 max-w-[180px]">
                    <span className="font-medium text-slate-300 group-hover:text-slate-100 truncate block">
                      {d.domain}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <span className="font-semibold tabular-nums" style={{ color }}>{d.authority_score}</span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-400">{fmtNumber(d.backlinks_num)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-400">
                    {followPct !== null ? fmtPercent(followPct) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-500 uppercase text-[10px]">{d.country || '—'}</td>
                  <td className="py-2 pr-3 text-right text-slate-500 whitespace-nowrap">{fmtUnixDate(d.first_seen)}</td>
                  <td className="py-2 pr-3 text-right text-slate-500 whitespace-nowrap">{fmtUnixDate(d.last_seen)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Anchor texts table ────────────────────────────────────────────────────────

function AnchorsTable({ rows, totalLinks }: { rows: SemrushBacklinksData['anchors']; totalLinks: number }) {
  if (rows.length === 0) return null
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Top Anchor Texts</CardTitle>
        <span className="text-xs text-slate-500">{rows.length} anchors</span>
      </CardHeader>
      <div className="space-y-3">
        {rows.map((a, i) => {
          const pct           = totalLinks > 0 ? (a.backlinks_num / totalLinks) * 100 : 0
          const hasFollowData = a.follows_num > 0 || a.nofollows_num > 0
          const followTotal   = a.follows_num + a.nofollows_num

          return (
            <div key={`${a.anchor}-${i}`}>
              <div className="mb-1 flex items-start justify-between gap-2 text-xs">
                <span className="truncate font-medium text-slate-300 max-w-[55%]">
                  {a.anchor ? a.anchor : <em className="text-slate-600">empty anchor</em>}
                </span>
                <div className="flex items-center gap-3 flex-shrink-0 text-right">
                  <span className="text-slate-500 tabular-nums">{fmtNumber(a.domains_num)} domains</span>
                  <span className="w-16 text-right tabular-nums text-slate-400">{fmtNumber(a.backlinks_num)} links</span>
                </div>
              </div>

              {/* Proportional bar: dofollow/nofollow if available, otherwise share-of-total */}
              {hasFollowData ? (
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-800/60">
                  <div
                    className="h-full rounded-l-full bg-emerald-500/70"
                    style={{ width: `${(a.follows_num / followTotal) * 100}%` }}
                  />
                  <div
                    className="h-full rounded-r-full bg-slate-600/80"
                    style={{ width: `${(a.nofollows_num / followTotal) * 100}%` }}
                  />
                </div>
              ) : (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-orange-500/60"
                    style={{ width: `${Math.min(pct * 3, 100)}%` }}
                  />
                </div>
              )}

              {/* Date range */}
              {(a.first_seen || a.last_seen) && (
                <p className="mt-0.5 text-[9px] text-slate-700">
                  {fmtUnixDate(a.first_seen)} → {fmtUnixDate(a.last_seen)}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      {rows.some((a) => a.follows_num > 0 || a.nofollows_num > 0) && (
        <div className="mt-4 flex items-center gap-4 border-t border-slate-800 pt-3 text-[10px] text-slate-600">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500/70" />Dofollow
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-600/80" />Nofollow
          </span>
        </div>
      )}
    </Card>
  )
}

// ── TLD distribution ──────────────────────────────────────────────────────────

function TldChart({ rows }: { rows: SemrushBacklinksData['tld'] }) {
  if (rows.length === 0) return null
  const total = rows.reduce((s, r) => s + r.domains_num, 0) || 1
  return (
    <Card>
      <CardHeader>
        <CardTitle>TLD Distribution</CardTitle>
        <span className="text-xs text-slate-500">by referring domains</span>
      </CardHeader>
      <div className="space-y-2.5">
        {rows.map((t, i) => {
          const pct = (t.domains_num / total) * 100
          return (
            <div key={t.zone}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-mono text-slate-400">.{t.zone}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 tabular-nums">{fmtNumber(t.domains_num)} domains</span>
                  <span className="w-10 text-right tabular-nums text-slate-400">{pct.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Geographic distribution ───────────────────────────────────────────────────

function GeoChart({ rows }: { rows: SemrushBacklinksData['geo'] }) {
  if (rows.length === 0) return null
  const max = Math.max(...rows.map((r) => r.domains_num), 1)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Countries</CardTitle>
        <span className="text-xs text-slate-500">by referring domains</span>
      </CardHeader>
      <div className="space-y-2.5">
        {rows.map((g, i) => {
          const pct = (g.domains_num / max) * 100
          return (
            <div key={g.country_name}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-slate-300">{g.country_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 tabular-nums">{fmtNumber(g.domains_num)} domains</span>
                  <span className="w-16 text-right tabular-nums text-slate-400">{fmtNumber(g.backlinks_num)} links</span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Top external pages linking to this domain ─────────────────────────────────

function PagesTable({ rows }: { rows: SemrushBacklinksData['pages'] }) {
  if (rows.length === 0) return null
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Top Linking Pages</CardTitle>
        <span className="text-xs text-slate-500">external pages with the most links to this domain</span>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="pb-2 pl-3 text-left font-medium">#</th>
              <th className="pb-2 pl-2 text-left font-medium">Page</th>
              <th className="pb-2 pr-3 text-right font-medium">Score</th>
              <th className="pb-2 pr-3 text-right font-medium">Links</th>
              <th className="pb-2 pr-3 text-right font-medium">Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.map((p, i) => {
              const { color } = authorityGrade(p.page_ascore)
              return (
                <tr key={`${p.source_url}-${i}`} className="group hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 pl-3 text-slate-600 tabular-nums">{i + 1}</td>
                  <td className="py-2.5 pl-2 pr-3 max-w-[300px]">
                    <a
                      href={p.source_url.startsWith('http') ? p.source_url : `https://${p.source_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/link flex flex-col gap-0.5"
                    >
                      {p.source_title && (
                        <span className="font-medium text-slate-300 group-hover/link:text-orange-300 transition-colors truncate block">
                          {p.source_title}
                        </span>
                      )}
                      <span className="text-slate-600 group-hover/link:text-slate-500 transition-colors truncate block text-[10px]">
                        {truncateUrl(p.source_url)}
                      </span>
                    </a>
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    {p.page_ascore > 0 ? (
                      <span className="font-semibold tabular-nums" style={{ color }}>{p.page_ascore}</span>
                    ) : (
                      <span className="text-slate-700">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-slate-400">{fmtNumber(p.backlinks_num)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-slate-500 whitespace-nowrap">
                    {fmtUnixDate(p.last_seen)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function BacklinksSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-8 w-14" />
            <Skeleton className="mt-2 h-1 w-full" />
            <Skeleton className="mt-1 h-2.5 w-12" />
          </Card>
        ))}
      </div>
      {/* Ref domains + anchors */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3"><Card><Skeleton className="h-72 w-full" /></Card></div>
        <div className="lg:col-span-2"><Card><Skeleton className="h-72 w-full" /></Card></div>
      </div>
      {/* TLD + Geo */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card><Skeleton className="h-52 w-full" /></Card>
        <Card><Skeleton className="h-52 w-full" /></Card>
      </div>
      {/* Pages */}
      <Card><Skeleton className="h-48 w-full" /></Card>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function SemrushBacklinksSection({ data, loading, error, domain }: Props) {
  if (loading) return <BacklinksSkeleton />

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Failed to load backlink data</p>
          <p className="mt-0.5 text-xs text-red-400/80">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  // API-level errors embedded in data
  if (data.error) {
    return <ErrorBanner domain={domain} error={data.error} error_message={data.error_message} />
  }

  const totalLinks = data.overview?.total ?? 0

  return (
    <div className="space-y-6">
      {/* Section divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-800" />
        <span className="text-[10px] uppercase tracking-widest text-slate-600">Backlink Profile</span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>

      {/* KPI strip */}
      <OverviewKPIs ov={data.overview} />

      {/* Ref domains (wide) + Anchors */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RefDomainsTable rows={data.ref_domains} />
        </div>
        <div className="lg:col-span-2">
          <AnchorsTable rows={data.anchors} totalLinks={totalLinks} />
        </div>
      </div>

      {/* TLD + Geo */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TldChart rows={data.tld} />
        <GeoChart rows={data.geo} />
      </div>

      {/* Top linking pages */}
      <PagesTable rows={data.pages} />
    </div>
  )
}
