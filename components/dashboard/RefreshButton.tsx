'use client'

import { RefreshCw, CheckCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RefreshStatus } from '@/lib/types'

interface Props {
  status: RefreshStatus
  progressMessage?: string
  onRefresh: () => void
  onCancel: () => void
}

export function RefreshButton({ status, progressMessage, onRefresh, onCancel }: Props) {
  const isActive = status === 'triggering' || status === 'polling'

  return (
    <div className="flex items-center gap-2">
      {isActive && progressMessage && (
        <span className="hidden text-xs text-slate-400 sm:block">
          {progressMessage}
        </span>
      )}

      {status === 'done' && (
        <span className="flex items-center gap-1 text-xs text-emerald-400">
          <CheckCircle size={13} />
          Updated
        </span>
      )}

      {status === 'error' && (
        <span className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle size={13} />
          {progressMessage || 'Error'}
        </span>
      )}

      {isActive ? (
        <button
          onClick={onCancel}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X size={14} />
          Cancel
        </button>
      ) : (
        <button
          onClick={onRefresh}
          disabled={status === 'done'}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            status === 'done'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95'
          )}
        >
          <RefreshCw
            size={14}
            className={cn(isActive && 'animate-spin')}
          />
          Refresh Data
        </button>
      )}
    </div>
  )
}
