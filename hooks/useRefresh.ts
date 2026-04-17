'use client'

import { useState, useRef, useCallback } from 'react'
import type { DateRange, GAProperty, RefreshStatus } from '@/lib/types'

interface UseRefreshReturn {
  status:          RefreshStatus
  progressMessage: string
  elapsedSeconds:  number
  trigger: (range: DateRange, property: GAProperty, onDone: () => Promise<void>) => Promise<void>
  cancel:  () => void
}

const POLL_INTERVAL_MS = 5_000          // check every 5 s
const MAX_WAIT_MS      = 15 * 60 * 1000 // show warning after 15 min

function getProgressMessage(elapsed: number): string {
  if (elapsed <  20) return 'Triggering n8n workflow…'
  if (elapsed <  60) return 'Connecting to Google Analytics API…'
  if (elapsed < 150) return 'Fetching sessions & KPI overview…'
  if (elapsed < 270) return 'Fetching traffic sources & top pages…'
  if (elapsed < 420) return 'Fetching device & geographic breakdown…'
  if (elapsed < 570) return 'Storing all data to database…'
  if (elapsed < 720) return 'Large date range — almost done…'
  const m = Math.floor(elapsed / 60)
  const s = String(elapsed % 60).padStart(2, '0')
  return `Still running… ${m}m ${s}s elapsed`
}

export function useRefresh(): UseRefreshReturn {
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
    range:    DateRange,
    property: GAProperty,
    onDone:   () => Promise<void>
  ) => {
    cancelledRef.current = false
    startTimeRef.current = Date.now()
    setStatus('triggering')
    setElapsed(0)

    elapsedTimerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1_000)

    try {
      // Step 1: Trigger n8n. Server snapshots the latest refresh_log id
      // BEFORE firing the webhook, so we know exactly what "new" means.
      const triggerRes = await fetch('/api/refresh', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date:   range.start,
          end_date:     range.end,
          property_id:  property.property_id,
          display_name: property.display_name,
        }),
      })

      if (!triggerRes.ok) {
        const errBody = await triggerRes.json().catch(() => ({}))
        throw new Error(errBody.error ?? 'Failed to start pipeline')
      }

      const { last_log_id } = await triggerRes.json()
      setStatus('polling')

      // Step 2: Poll for a NEW row in refresh_log with id > last_log_id.
      // n8n INSERTs exactly one row as its very last node.
      const statusUrl =
        `/api/refresh/status` +
        `?property_id=${encodeURIComponent(property.property_id)}` +
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
        } catch {
          // Network hiccup — keep polling
        }

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
