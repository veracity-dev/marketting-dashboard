import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { start_date, end_date, property_id, display_name } = body

    if (!start_date || !end_date || !property_id) {
      return NextResponse.json(
        { error: 'start_date, end_date and property_id are required' },
        { status: 400 }
      )
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ error: 'N8N_WEBHOOK_URL not configured' }, { status: 500 })
    }

    // Snapshot the latest refresh_log id for this property BEFORE triggering.
    // The client will poll for any row with id > last_log_id — simple and
    // immune to timestamp formatting/precision issues.
    const sb = getSupabase()
    const { data: logRows } = await sb
      .from('refresh_log')
      .select('id')
      .eq('property_id', property_id)
      .order('id', { ascending: false })
      .limit(1)

    const last_log_id = logRows?.[0]?.id ?? 0

    // Fire and forget — n8n.cloud sits behind Cloudflare (~100 s timeout).
    fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date,
        end_date,
        property_id,
        display_name: display_name ?? property_id,
      }),
    }).catch((err) => console.error('[refresh] n8n fire-and-forget error:', err))

    return NextResponse.json({ status: 'accepted', last_log_id })
  } catch (err) {
    console.error('[refresh] route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
