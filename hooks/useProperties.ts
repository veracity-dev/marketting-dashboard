'use client'

import { useState, useCallback, useEffect } from 'react'
import type { GAProperty } from '@/lib/types'

interface UsePropertiesReturn {
  properties: GAProperty[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useProperties(): UsePropertiesReturn {
  const [properties, setProperties] = useState<GAProperty[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/ga/properties')
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to load properties')
        setProperties([])
      } else {
        setProperties(json.properties ?? [])
      }
    } catch {
      setError('Network error — could not load properties')
      setProperties([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { properties, loading, error, refetch }
}
