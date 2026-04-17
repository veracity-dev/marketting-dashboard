'use client'

import { Database, BarChart3, Globe, Cpu, TrendingUp, CheckCircle2 } from 'lucide-react'

// Each step activates at this many elapsed seconds
const STEPS = [
  { icon: Globe,        label: 'Connecting to Google Analytics API',    activeAt:   0 },
  { icon: BarChart3,    label: 'Fetching sessions & KPI overview',      activeAt:  60 },
  { icon: TrendingUp,   label: 'Fetching traffic sources & top pages',  activeAt: 150 },
  { icon: Cpu,          label: 'Fetching device & geographic data',      activeAt: 270 },
  { icon: Database,     label: 'Writing all data to database',           activeAt: 420 },
  { icon: CheckCircle2, label: 'Finalising & verifying…',               activeAt: 570 },
]

function getActiveStep(elapsedSeconds: number): number {
  let step = 0
  for (let i = 0; i < STEPS.length; i++) {
    if (elapsedSeconds >= STEPS[i].activeAt) step = i
  }
  return step
}

function fmtElapsed(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0
    ? `${m}m ${String(sec).padStart(2, '0')}s`
    : `${sec}s`
}

interface Props {
  visible:        boolean
  message?:       string
  elapsedSeconds?: number
}

export function LoadingOverlay({ visible, message, elapsedSeconds = 0 }: Props) {
  const activeStep = getActiveStep(elapsedSeconds)

  if (!visible) return null

  const Icon = STEPS[activeStep].icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl shadow-black/60">

        {/* Animated ring */}
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#1e293b" strokeWidth="4" />
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke="#6366f1"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="213.6"
              strokeDashoffset="53.4"
              className="animate-[spin_2s_linear_infinite]"
              style={{ transformOrigin: 'center' }}
            />
          </svg>
          <div className="relative z-10 text-indigo-400">
            <Icon size={28} className="animate-pulse" />
          </div>
        </div>

        <h3 className="mb-1 text-base font-semibold text-slate-100">
          Refreshing GA4 Data
        </h3>
        <p className="mb-1 text-sm text-slate-400">
          {message || STEPS[activeStep].label}
        </p>

        {/* Elapsed time */}
        {elapsedSeconds > 0 && (
          <p className="mb-5 text-xs text-slate-600">
            {fmtElapsed(elapsedSeconds)} elapsed
          </p>
        )}

        {/* Step dots */}
        <div className="flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-700 ${
                i === activeStep
                  ? 'w-5 bg-indigo-500'
                  : i < activeStep
                  ? 'w-1.5 bg-indigo-500/40'
                  : 'w-1.5 bg-slate-700'
              }`}
            />
          ))}
        </div>

        <p className="mt-5 text-xs text-slate-600">
          Typically takes 5–10 minutes for large date ranges
        </p>
      </div>
    </div>
  )
}
