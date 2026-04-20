'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GSCSite } from '@/lib/types'

interface UseGSCSitesReturn {
  sites: GSCSite[]
  loading: boolean
  refreshing: boolean
  error: string | null
  refetch: () => Promise<void>             // read cached from Supabase
  refreshFromGSC: () => Promise<void>      // hit n8n → fresh list from Google
}

export function useGSCSites(): UseGSCSitesReturn {
  const [sites, setSites]             = useState<GSCSite[]>([])
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/gsc/sites')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setSites(json.sites ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sites')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshFromGSC = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const res = await fetch('/api/gsc/sites', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setSites(json.sites ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh site list')
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { sites, loading, refreshing, error, refetch, refreshFromGSC }
}
