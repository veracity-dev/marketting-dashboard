import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const AGENT_URL = process.env.AGENT_API_URL ?? 'http://localhost:8000'

/** GET /api/chat/sessions/[id]/messages — get messages for a session */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const res = await fetch(`${AGENT_URL}/api/sessions/${id}/messages`)
  const data = await res.json()
  return NextResponse.json(data)
}
