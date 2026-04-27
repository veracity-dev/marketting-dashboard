import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DataSource } from '@/lib/types'

interface SourceDef {
  id: DataSource
  label: string
  icon: string
  available: boolean
}

const SOURCES: SourceDef[] = [
  { id: 'ga4',         label: 'Google Analytics',      icon: '📊', available: true  },
  { id: 'gsc',         label: 'Search Console',        icon: '🔍', available: true  },
  { id: 'semrush',     label: 'Semrush',               icon: '🔗', available: true  },
  { id: 'google_ads',  label: 'Google Ads',            icon: '🎯', available: false },
  { id: 'meta',        label: 'Meta Ads',              icon: '📘', available: false },
  { id: 'linkedin',    label: 'LinkedIn',              icon: '💼', available: false },
]

interface Props {
  active: DataSource
  onChange: (source: DataSource) => void
}

export function SourceTabs({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      {/* Data source tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            onClick={() => s.available && onChange(s.id)}
            disabled={!s.available}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all',
              active === s.id
                ? 'bg-slate-800 text-slate-100 font-medium shadow-sm'
                : s.available
                ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                : 'cursor-not-allowed text-slate-700'
            )}
          >
            <span className={cn(!s.available && 'opacity-40')}>{s.icon}</span>
            <span className="hidden sm:block">{s.label}</span>
            {!s.available && (
              <span className="hidden rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 sm:block">
                Soon
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* AI Agent tab */}
      <button
        onClick={() => onChange('agent')}
        className={cn(
          'group relative flex items-center gap-2 rounded-xl border px-4 py-1.5 text-sm font-medium transition-all',
          active === 'agent'
            ? 'border-indigo-500/50 bg-indigo-600/20 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
            : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-indigo-500/40 hover:text-indigo-300'
        )}
      >
        {/* Glow ring animation */}
        {active !== 'agent' && (
          <span className="absolute inset-0 rounded-xl border border-indigo-500/30 animate-[agent-glow_2.5s_ease-in-out_infinite]" />
        )}
        <Bot size={15} className={cn(active !== 'agent' && 'animate-[agent-pulse_2.5s_ease-in-out_infinite]')} />
        <span className="hidden sm:block">AI Agent</span>
      </button>
    </div>
  )
}
