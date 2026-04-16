import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { start_date, end_date } = body

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' },
        { status: 400 }
      )
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'N8N_WEBHOOK_URL not configured' },
        { status: 500 }
      )
    }

    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date, end_date }),
    })

    if (!n8nRes.ok && n8nRes.status !== 202) {
      const text = await n8nRes.text()
      console.error('n8n webhook error:', n8nRes.status, text)
      return NextResponse.json(
        { error: 'Failed to trigger n8n pipeline', detail: text },
        { status: 502 }
      )
    }

    return NextResponse.json({
      status: 'accepted',
      triggered_at: new Date().toISOString(),
      message: 'GA4 pipeline started. Data will be ready in ~30–60 seconds.',
    })
  } catch (err) {
    console.error('Refresh route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
