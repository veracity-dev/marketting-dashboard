'use client'

import { useState, useCallback } from 'react'
import type { SemrushDomainData } from '@/lib/types'

interface UseSemrushDataReturn {
  data: SemrushDomainData | null
  loading: boolean
  error: string | null
  fetchData: (domain: string, database?: string) => Promise<void>
}

export function useSemrushData(): UseSemrushDataReturn {
  const [data, setData]       = useState<SemrushDomainData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const fetchData = useCallback(async (domain: string, database = 'us') => {
    if (!domain) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/semrush/domain?domain=${encodeURIComponent(domain)}&database=${database}`
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Semrush data')
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, fetchData }
}
