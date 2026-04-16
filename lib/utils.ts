import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, subDays, parseISO } from 'date-fns'
import type { DateRange } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Formatters ───────────────────────────────────────────────────────────────

export function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export function fmtCurrency(n: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export function fmtPercent(n: number, decimals = 1): string {
  // n is 0-1 from GA4, convert to percentage
  return `${(n * 100).toFixed(decimals)}%`
}

export function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

export function fmtDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d')
  } catch {
    return dateStr
  }
}

export function fmtDateFull(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function fmtRelativeTime(isoStr: string): string {
  const ms = Date.now() - new Date(isoStr).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

// ── Date range presets ───────────────────────────────────────────────────────

export const DATE_RANGE_PRESETS: { label: string; days: number }[] = [
  { label: 'Last 7 days',  days: 7  },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
]

export function getPresetRange(days: number): DateRange {
  const end   = new Date()
  const start = subDays(end, days - 1)
  return {
    start: toISODate(start),
    end:   toISODate(end),
    label: `Last ${days} days`,
  }
}

export function defaultDateRange(): DateRange {
  return getPresetRange(30)
}

// ── Chart helpers ────────────────────────────────────────────────────────────

export const CHART_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#3b82f6', // blue
]

export const CHANNEL_COLORS: Record<string, string> = {
  'Organic Search':  '#6366f1',
  'Paid Search':     '#f59e0b',
  'Organic Social':  '#ec4899',
  'Direct':          '#06b6d4',
  'Referral':        '#10b981',
  'Email':           '#8b5cf6',
  'Display':         '#3b82f6',
  'Affiliates':      '#f97316',
  'Unassigned':      '#64748b',
}

export function channelColor(channel: string): string {
  return CHANNEL_COLORS[channel] ?? '#64748b'
}

// ── Delta / trend ────────────────────────────────────────────────────────────

export function calcDelta(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}
