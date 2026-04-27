import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const AGENT_URL = process.env.AGENT_API_URL ?? 'http://localhost:8000'

/** POST /api/chat — proxy chat message to FastAPI, forward SSE stream */
export async function POST(req: NextRequest) {
  const body = await req.json()

  const upstream = await fetch(`${AGENT_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!upstream.ok || !upstream.body) {
    return new Response(
      JSON.stringify({ error: 'Agent request failed' }),
      { status: upstream.status, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Forward the SSE stream directly
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
