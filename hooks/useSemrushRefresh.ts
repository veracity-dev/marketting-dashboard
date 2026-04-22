'use client'

import { useState, useCallback } from 'react'

export type SemrushRefreshStatus = 'idle' | 'refreshing' | 'done' | 'error'

interface UseSemrushRefreshReturn {
  status:  SemrushRefreshStatus
  error:   string | null
  refresh: (domain: string, database: string) => Promise<void>
  reset:   () => void
}

export function useSemrushRefresh(): UseSemrushRefreshReturn {
  const [status, setStatus] = useState<SemrushRefreshStatus>('idle')
  const [error,  setError]  = useState<string | null>(null)

  const refresh = useCallback(async (domain: string, database: string) => {
    if (!domain) return
    setStatus('refreshing')
    setError(null)
    try {
      const res = await fetch('/api/semrush/refresh', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ domain, database }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed')
      setStatus('error')
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  return { status, error, refresh, reset }
}
