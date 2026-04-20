'use client'

import { useState, useCallback } from 'react'
import type { GSCData, DateRange } from '@/lib/types'

interface UseGSCDataReturn {
  data: GSCData | null
  loading: boolean
  error: string | null
  fetchData: (range: DateRange, siteUrl: string) => Promise<void>
}

export function useGSCData(): UseGSCDataReturn {
  const [data, setData]       = useState<GSCData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const fetchData = useCallback(async (range: DateRange, siteUrl: string) => {
    if (!siteUrl) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/gsc/analytics?start_date=${range.start}&end_date=${range.end}&site_url=${encodeURIComponent(siteUrl)}`
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load GSC data')
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, fetchData }
}
