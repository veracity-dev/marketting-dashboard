'use client'

import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { cn, getPresetRange, toISODate, DATE_RANGE_PRESETS } from '@/lib/utils'
import type { DateRange } from '@/lib/types'

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
  disabled?: boolean
}

export function DateRangePicker({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [customStart, setCustomStart] = useState(value.start)
  const [customEnd,   setCustomEnd]   = useState(value.end)

  function applyPreset(days: number) {
    onChange(getPresetRange(days))
    setOpen(false)
  }

  function applyCustom() {
    if (customStart && customEnd && customStart <= customEnd) {
      onChange({ start: customStart, end: customEnd, label: 'Custom range' })
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200',
          'hover:border-slate-600 hover:bg-slate-750 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <Calendar size={14} className="text-slate-400" />
        <span>{value.label}</span>
        <ChevronDown size={14} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl shadow-black/40">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Quick select</p>
            <div className="space-y-1">
              {DATE_RANGE_PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => applyPreset(p.days)}
                  className={cn(
                    'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    value.label === p.label
                      ? 'bg-indigo-600/20 text-indigo-300'
                      : 'text-slate-300 hover:bg-slate-800'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="my-3 border-t border-slate-800" />
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Custom range</p>
            <div className="space-y-2">
              <input
                type="date"
                value={customStart}
                max={customEnd || toISODate(new Date())}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={toISODate(new Date())}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={applyCustom}
                disabled={!customStart || !customEnd || customStart > customEnd}
                className="w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
