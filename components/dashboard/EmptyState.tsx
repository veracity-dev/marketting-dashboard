import { BarChart2, RefreshCw } from 'lucide-react'

interface Props {
  onRefresh: () => void
  isRefreshing?: boolean
}

export function EmptyState({ onRefresh, isRefreshing }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
        <BarChart2 size={36} className="text-slate-600" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-slate-200">No data yet</h2>
      <p className="mb-8 max-w-sm text-sm text-slate-500">
        Click <strong className="text-slate-300">Refresh Data</strong> to fetch the latest
        Google Analytics data for the selected date range. This takes about 30–60 seconds.
      </p>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60 transition-all active:scale-95"
      >
        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        Fetch GA4 Data
      </button>
    </div>
  )
}
