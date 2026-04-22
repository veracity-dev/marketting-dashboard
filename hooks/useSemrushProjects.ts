'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SemrushProject } from '@/lib/types'

interface UseSemrushProjectsReturn {
  projects: SemrushProject[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useSemrushProjects(): UseSemrushProjectsReturn {
  const [projects, setProjects] = useState<SemrushProject[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/semrush/projects')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setProjects(json.projects ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { projects, loading, error, refetch }
}
