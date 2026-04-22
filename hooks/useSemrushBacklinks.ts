'use client'

import { useState, useCallback } from 'react'
import type { SemrushBacklinksData } from '@/lib/types'

interface UseSemrushBacklinksReturn {
  data: SemrushBacklinksData | null
  loading: boolean
  error: string | null
  fetchData: (domain: string) => Promise<void>
}

export function useSemrushBacklinks(): UseSemrushBacklinksReturn {
  const [data, setData]       = useState<SemrushBacklinksData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const fetchData = useCallback(async (domain: string) => {
    if (!domain) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/semrush/backlinks?domain=${encodeURIComponent(domain)}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load backlinks data')
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, fetchData }
}
