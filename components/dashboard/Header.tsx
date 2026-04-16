import { BarChart2, Clock } from 'lucide-react'
import { fmtRelativeTime } from '@/lib/utils'
import { DateRangePicker } from './DateRangePicker'
import { RefreshButton } from './RefreshButton'
import type { DateRange, RefreshStatus } from '@/lib/types'

interface Props {
  dateRange: DateRange
  onDateChange: (r: DateRange) => void
  lastCollectedAt: string | null
  refreshStatus: RefreshStatus
  refreshMessage: string
  onRefresh: () => void
  onCancel: () => void
}

export function Header({
  dateRange,
  onDateChange,
  lastCollectedAt,
  refreshStatus,
  refreshMessage,
  onRefresh,
  onCancel,
}: Props) {
  const isActive = refreshStatus === 'triggering' || refreshStatus === 'polling'

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4">
        {/* Logo / title */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <BarChart2 size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100">Marketing Dashboard</h1>
            <p className="text-xs text-slate-500">
              {process.env.NEXT_PUBLIC_GA4_PROPERTY_NAME ?? 'Veracity AI'}
            </p>
          </div>
        </div>

        {/* Right: last updated + date picker + refresh */}
        <div className="flex items-center gap-3">
          {lastCollectedAt && (
            <span className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
              <Clock size={12} />
              Updated {fmtRelativeTime(lastCollectedAt)}
            </span>
          )}

          <DateRangePicker
            value={dateRange}
            onChange={onDateChange}
            disabled={isActive}
          />

          <RefreshButton
            status={refreshStatus}
            progressMessage={refreshMessage}
            onRefresh={onRefresh}
            onCancel={onCancel}
          />
        </div>
      </div>
    </header>
  )
}
