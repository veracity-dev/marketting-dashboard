import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Triggers the GSC n8n workflow (fire-and-forget).
// Snapshots refresh_log.id BEFORE firing so the client can poll for new rows.
// Reuses the existing refresh_log table — site_url is stored in property_id column.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { start_date, end_date, site_url, permission_level } = body

    if (!start_date || !end_date || !site_url) {
      return NextResponse.json(
        { error: 'start_date, end_date and site_url are required' },
        { status: 400 }
      )
    }

    const webhookUrl = process.env.N8N_GSC_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ error: 'N8N_GSC_WEBHOOK_URL not configured' }, { status: 500 })
    }

    const sb = getSupabase()
    const { data: logRows } = await sb
      .from('refresh_log')
      .select('id')
      .eq('property_id', site_url)
      .order('id', { ascending: false })
      .limit(1)

    const last_log_id = logRows?.[0]?.id ?? 0

    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date,
        end_date,
        site_url,
        permission_level: permission_level ?? '',
      }),
    }).catch((err) => console.error('[gsc/refresh] n8n fire-and-forget error:', err))

    return NextResponse.json({ status: 'accepted', last_log_id })
  } catch (err) {
    console.error('[gsc/refresh] route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
