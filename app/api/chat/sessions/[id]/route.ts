import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const AGENT_URL = process.env.AGENT_API_URL ?? 'http://localhost:8000'

/** DELETE /api/chat/sessions/[id] — delete a chat session */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const res = await fetch(`${AGENT_URL}/api/sessions/${id}`, { method: 'DELETE' })
  const data = await res.json()
  return NextResponse.json(data)
}
