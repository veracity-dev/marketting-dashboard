'use client'

import { useState, useCallback } from 'react'
import type { GA4Data, DateRange } from '@/lib/types'

interface UseGA4DataReturn {
  data: GA4Data | null
  loading: boolean
  error: string | null
  fetchData: (range: DateRange, propertyId: string) => Promise<void>
}

export function useGA4Data(): UseGA4DataReturn {
  const [data, setData]       = useState<GA4Data | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const fetchData = useCallback(async (range: DateRange, propertyId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/analytics?start_date=${range.start}&end_date=${range.end}&property_id=${encodeURIComponent(propertyId)}`
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, fetchData }
}
