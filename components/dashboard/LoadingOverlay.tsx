'use client'

import { useEffect, useState } from 'react'
import { Database, BarChart3, Globe, Cpu, TrendingUp } from 'lucide-react'

const STEPS = [
  { icon: Globe,      label: 'Connecting to Google Analytics API' },
  { icon: BarChart3,  label: 'Fetching sessions & KPI overview' },
  { icon: TrendingUp, label: 'Fetching traffic sources by channel' },
  { icon: Globe,      label: 'Fetching top pages performance' },
  { icon: Cpu,        label: 'Fetching device & geo breakdown' },
  { icon: Database,   label: 'Writing data to database' },
]

interface Props {
  visible: boolean
  message?: string
}

export function LoadingOverlay({ visible, message }: Props) {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    if (!visible) { setActiveStep(0); return }
    const t = setInterval(() => {
      setActiveStep((s) => (s + 1) % STEPS.length)
    }, 4_500)
    return () => clearInterval(t)
  }, [visible])

  if (!visible) return null

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
            {(() => {
              const Icon = STEPS[activeStep].icon
              return <Icon size={28} className="animate-pulse" />
            })()}
          </div>
        </div>

        <h3 className="mb-1 text-base font-semibold text-slate-100">
          Refreshing GA4 Data
        </h3>
        <p className="mb-6 text-sm text-slate-400">
          {message || STEPS[activeStep].label}
        </p>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
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
          This usually takes 20–60 seconds
        </p>
      </div>
    </div>
  )
}
