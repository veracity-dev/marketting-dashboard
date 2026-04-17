import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { refreshJobs }  from '@/lib/refreshJobs'

// Never cache this route
export const dynamic = 'force-dynamic'

const HEARTBEAT_MS = 25_000   // keep-alive ping every 25 s
const FALLBACK_MS  = 15_000   // Supabase poll interval (fallback when callback can't reach us)
const TIMEOUT_MS   = 16 * 60 * 1000  // hard cut-off: 16 minutes

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(req: NextRequest) {
  const sp         = req.nextUrl.searchParams
  const jobId      = sp.get('job_id')      ?? ''
  const propertyId = sp.get('property_id') ?? ''
  const startDate  = sp.get('start_date')  ?? ''
  const endDate    = sp.get('end_date')    ?? ''
  // Generate server-side so there's no clock-skew false-positive:
  // a client timestamp could already be > existing collected_at rows.
  const since      = new Date().toISOString()

  const encoder = new TextEncoder()
  const sseMsg  = (obj: object) =>
    encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)

  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      // Send connection confirmation
      controller.enqueue(encoder.encode(': connected\n\n'))

      // ── helpers ─────────────────────────────────────────────────────────────

      function finish(payload: Record<string, unknown>) {
        if (closed) return
        closed = true
        try {
          controller.enqueue(sseMsg(payload))
          controller.close()
        } catch {}
        cleanup()
      }

      function cleanup() {
        clearInterval(heartbeatTimer)
        clearInterval(fallbackTimer)
        clearTimeout(hardTimeout)
        refreshJobs.delete(jobId)
      }

      // ── heartbeat — proxies & load balancers drop idle SSE ───────────────────
      const heartbeatTimer = setInterval(() => {
        if (closed) return
        try { controller.enqueue(encoder.encode(': heartbeat\n\n')) }
        catch { cleanup() }
      }, HEARTBEAT_MS)

      // ── hard timeout ─────────────────────────────────────────────────────────
      const hardTimeout = setTimeout(() => {
        finish({ type: 'timeout' })
      }, TIMEOUT_MS)

      // ── Supabase fallback poll ────────────────────────────────────────────────
      // Polls ga_device_geo — the largest table, always written last in the
      // pipeline. Only fires 'done' once the heaviest branch is confirmed done,
      // preventing false-positives from lighter tables finishing earlier.
      const sb = getSupabase()
      const fallbackTimer = setInterval(async () => {
        if (closed || !propertyId || !startDate || !endDate) return
        try {
          const { data } = await sb
            .from('ga_device_geo')
            .select('collected_at')
            .eq('property_id', propertyId)
            .gte('report_date', startDate)
            .lte('report_date', endDate)
            .order('collected_at', { ascending: false })
            .limit(1)

          const latest = data?.[0]?.collected_at
          if (latest && latest > since) {
            finish({ type: 'done', via: 'supabase_poll' })
          }
        } catch {
          // Supabase error — keep waiting
        }
      }, FALLBACK_MS)

      // ── instant callback handler ──────────────────────────────────────────────
      // Registered so /api/refresh/callback can push "done" the moment n8n calls
      // back. This fires immediately when APP_URL is reachable by n8n.
      if (jobId) {
        refreshJobs.set(jobId, {
          send:    (data) => { try { controller.enqueue(sseMsg(data)) } catch {} },
          finish:  (data) => finish(data),
          cleanup,
        })
      }
    },

    cancel() {
      // Browser tab closed / navigation
      closed = true
      refreshJobs.get(jobId)?.cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',  // disable nginx/Vercel response buffering
    },
  })
}
