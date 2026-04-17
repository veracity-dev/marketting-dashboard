import { NextRequest, NextResponse } from 'next/server'
import { refreshJobs } from '@/lib/refreshJobs'

// n8n's "Notify Complete" HTTP Request node posts here when the workflow finishes.
// We look up the waiting SSE stream by job_id and push the "done" event.
export async function POST(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('job_id')
  if (!jobId) {
    return NextResponse.json({ error: 'job_id is required' }, { status: 400 })
  }

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {}

  const job = refreshJobs.get(jobId)
  if (job) {
    // Small delay so the data is fully committed before the client re-fetches
    setTimeout(() => job.finish({ type: 'done', via: 'n8n_callback', ...body }), 500)
  }
  // If no job found (client navigated away), that's fine — just acknowledge

  return NextResponse.json({ ok: true })
}
