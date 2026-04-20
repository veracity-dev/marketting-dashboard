'use client'

import { useState, useRef, useCallback } from 'react'
import type { DateRange, GSCSite, RefreshStatus } from '@/lib/types'

interface UseGSCRefreshReturn {
  status:          RefreshStatus
  progressMessage: string
  elapsedSeconds:  number
  trigger: (range: DateRange, site: GSCSite, onDone: () => Promise<void>) => Promise<void>
  cancel:  () => void
}

const POLL_INTERVAL_MS = 5_000
const MAX_WAIT_MS      = 15 * 60 * 1000

function getProgressMessage(elapsed: number): string {
  if (elapsed <  15) return 'Triggering n8n workflow…'
  if (elapsed <  60) return 'Connecting to Search Console API…'
  if (elapsed < 150) return 'Fetching daily clicks & impressions…'
  if (elapsed < 270) return 'Fetching top queries & pages…'
  if (elapsed < 420) return 'Fetching country & device breakdowns…'
  if (elapsed < 570) return 'Storing all data to database…'
  if (elapsed < 720) return 'Large date range — almost done…'
  const m = Math.floor(elapsed / 60)
  const s = String(elapsed % 60).padStart(2, '0')
  return `Still running… ${m}m ${s}s elapsed`
}

export function useGSCRefresh(): UseGSCRefreshReturn {
  const [status,  setStatus]  = useState<RefreshStatus>('idle')
  const [elapsed, setElapsed] = useState(0)

  const cancelledRef    = useRef(false)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimeRef    = useRef<number>(0)

  function stopTimers() {
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null }
    if (pollTimerRef.current)    { clearTimeout(pollTimerRef.current);     pollTimerRef.current    = null }
  }

  const cancel = useCallback(() => {
    cancelledRef.current = true
    stopTimers()
    setStatus('idle')
    setElapsed(0)
  }, [])

  const trigger = useCallback(async (
    range: DateRange,
    site:  GSCSite,
    onDone: () => Promise<void>
  ) => {
    cancelledRef.current = false
    startTimeRef.current = Date.now()
    setStatus('triggering')
    setElapsed(0)

    elapsedTimerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1_000)

    try {
      const triggerRes = await fetch('/api/gsc/refresh', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date:       range.start,
          end_date:         range.end,
          site_url:         site.site_url,
          permission_level: site.permission_level,
        }),
      })

      if (!triggerRes.ok) {
        const errBody = await triggerRes.json().catch(() => ({}))
        throw new Error(errBody.error ?? 'Failed to start GSC pipeline')
      }

      const { last_log_id } = await triggerRes.json()
      setStatus('polling')

      // Reuse /api/refresh/status — property_id parameter = site_url (same column in refresh_log).
      const statusUrl =
        `/api/refresh/status` +
        `?property_id=${encodeURIComponent(site.site_url)}` +
        `&last_log_id=${last_log_id}`

      const deadline = Date.now() + MAX_WAIT_MS

      const poll = async () => {
        if (cancelledRef.current) return

        if (Date.now() >= deadline) {
          stopTimers()
          setStatus('error')
          setTimeout(() => { setStatus('idle'); setElapsed(0) }, 8_000)
          return
        }

        try {
          const res  = await fetch(statusUrl)
          const data = await res.json()

          if (cancelledRef.current) return

          if (data.status === 'done') {
            stopTimers()
            setStatus('done')
            setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
            await onDone()
            setTimeout(() => { setStatus('idle'); setElapsed(0) }, 3_000)
            return
          }

          if (data.status === 'error') {
            stopTimers()
            setStatus('error')
            setTimeout(() => { setStatus('idle'); setElapsed(0) }, 8_000)
            return
          }
        } catch { /* keep polling */ }

        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
      }

      pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS)

    } catch (err) {
      stopTimers()
      setStatus('error')
      setTimeout(() => { setStatus('idle'); setElapsed(0) }, 6_000)
    }
  }, [])

  const progressMessage =
    status === 'done'  ? 'Data updated successfully!' :
    status === 'error' ? 'Something went wrong — please try again.' :
    getProgressMessage(elapsed)

  return { status, progressMessage, elapsedSeconds: elapsed, trigger, cancel }
}
