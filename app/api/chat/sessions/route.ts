import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const AGENT_URL = process.env.AGENT_API_URL ?? 'http://localhost:8000'

/** GET /api/chat/sessions — list all chat sessions */
export async function GET() {
  const res = await fetch(`${AGENT_URL}/api/sessions`)
  const data = await res.json()
  return NextResponse.json(data)
}

/** POST /api/chat/sessions — create a new chat session */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${AGENT_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
