'use client'

import { useState, useRef, useCallback } from 'react'
import type { DateRange, RefreshStatus } from '@/lib/types'

interface UseRefreshReturn {
  status: RefreshStatus
  progressMessage: string
  trigger: (range: DateRange, onDone: () => void) => Promise<void>
  cancel: () => void
}

const POLL_INTERVAL_MS  = 4_000   // check Supabase every 4 s
const MAX_POLL_ATTEMPTS = 30      // give up after 2 minutes

const PROGRESS_MESSAGES = [
  'Connecting to Google Analytics…',
  'Fetching overview & KPI data…',
  'Fetching traffic sources…',
  'Fetching top pages…',
  'Fetching device & geo breakdown…',
  'Fetching e-commerce metrics…',
  'Storing data to database…',
  'Almost there…',
]

export function useRefresh(): UseRefreshReturn {
  const [status, setStatus]           = useState<RefreshStatus>('idle')
  const [progressMessage, setMessage] = useState('')
  const cancelledRef                  = useRef(false)
  const pollTimerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const msgTimerRef                   = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimers = () => {
    if (pollTimerRef.current)  clearTimeout(pollTimerRef.current)
    if (msgTimerRef.current)   clearInterval(msgTimerRef.current)
  }

  const cancel = useCallback(() => {
    cancelledRef.current = true
    clearTimers()
    setStatus('idle')
    setMessage('')
  }, [])

  const trigger = useCallback(async (range: DateRange, onDone: () => void) => {
    cancelledRef.current = false
    setStatus('triggering')
    setMessage(PROGRESS_MESSAGES[0])

    // Cycle through progress messages while waiting
    let msgIdx = 0
    msgTimerRef.current = setInterval(() => {
      msgIdx = (msgIdx + 1) % PROGRESS_MESSAGES.length
      setMessage(PROGRESS_MESSAGES[msgIdx])
    }, 4_000)

    try {
      // 1. Trigger n8n
      const triggerRes = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: range.start, end_date: range.end }),
      })

      if (!triggerRes.ok) {
        const body = await triggerRes.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to start pipeline')
      }

      const { triggered_at } = await triggerRes.json()
      const since = triggered_at ?? new Date().toISOString()

      setStatus('polling')

      // 2. Poll Supabase until collected_at > since
      let attempts = 0
      const poll = async () => {
        if (cancelledRef.current) return
        attempts++

        try {
          const pollRes = await fetch(
            `/api/analytics?start_date=${range.start}&end_date=${range.end}&poll=true`
          )
          const { last_collected_at } = await pollRes.json()

          if (last_collected_at && last_collected_at > since) {
            // Data is fresh — done!
            clearTimers()
            setStatus('done')
            setMessage('Data updated successfully!')
            onDone()
            setTimeout(() => {
              setStatus('idle')
              setMessage('')
            }, 3_000)
            return
          }
        } catch {
          // swallow poll error, keep trying
        }

        if (attempts >= MAX_POLL_ATTEMPTS) {
          clearTimers()
          setStatus('error')
          setMessage('Timed out waiting for data. Try refreshing manually.')
          setTimeout(() => { setStatus('idle'); setMessage('') }, 5_000)
          return
        }

        if (!cancelledRef.current) {
          pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
        }
      }

      pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS)

    } catch (err) {
      clearTimers()
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Something went wrong')
      setTimeout(() => { setStatus('idle'); setMessage('') }, 5_000)
    }
  }, [])

  return { status, progressMessage, trigger, cancel }
}
