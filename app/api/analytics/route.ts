import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side client uses the service role key so it bypasses RLS.
// This key is never sent to the browser — only used in API routes.
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const key        = serviceKey ?? anonKey
  // Debug — remove after confirming key is correct
  console.log('[analytics] using key type:', serviceKey ? 'service_role' : 'anon (SUPABASE_SERVICE_ROLE_KEY not set!)')
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key)
}

const PROPERTY_ID = process.env.NEXT_PUBLIC_GA4_PROPERTY_ID ?? '523852603'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const start = searchParams.get('start_date')
  const end   = searchParams.get('end_date')
  // poll=true: only return last collected_at (lightweight check during refresh)
  const pollOnly = searchParams.get('poll') === 'true'

  if (!start || !end) {
    return NextResponse.json(
      { error: 'start_date and end_date query params are required' },
      { status: 400 }
    )
  }

  try {
    const supabase = getSupabase()

    if (pollOnly) {
      // Cheap query: just get the most recent collected_at across all tables
      const { data } = await supabase
        .from('ga_daily_overview')
        .select('collected_at')
        .eq('property_id', PROPERTY_ID)
        .gte('report_date', start)
        .lte('report_date', end)
        .order('collected_at', { ascending: false })
        .limit(1)

      return NextResponse.json({
        last_collected_at: data?.[0]?.collected_at ?? null,
      })
    }

    // Full fetch — all 5 tables in parallel
    const [overview, ecommerce, traffic, pages, deviceGeo] = await Promise.all([
      supabase
        .from('ga_daily_overview')
        .select('*')
        .eq('property_id', PROPERTY_ID)
        .gte('report_date', start)
        .lte('report_date', end)
        .order('report_date', { ascending: true }),

      supabase
        .from('ga_ecommerce')
        .select('*')
        .eq('property_id', PROPERTY_ID)
        .gte('report_date', start)
        .lte('report_date', end)
        .order('report_date', { ascending: true }),

      supabase
        .from('ga_traffic_sources')
        .select('*')
        .eq('property_id', PROPERTY_ID)
        .gte('report_date', start)
        .lte('report_date', end)
        .order('report_date', { ascending: true }),

      supabase
        .from('ga_top_pages')
        .select('*')
        .eq('property_id', PROPERTY_ID)
        .gte('report_date', start)
        .lte('report_date', end)
        .order('screen_page_views', { ascending: false })
        .limit(50),

      supabase
        .from('ga_device_geo')
        .select('*')
        .eq('property_id', PROPERTY_ID)
        .gte('report_date', start)
        .lte('report_date', end)
        .order('sessions', { ascending: false }),
    ])

    // Check for errors
    const errors = [overview, ecommerce, traffic, pages, deviceGeo]
      .map((r) => r.error)
      .filter(Boolean)
    if (errors.length) {
      console.error('Supabase query errors:', errors)
      return NextResponse.json({ error: 'Database query failed', details: errors }, { status: 500 })
    }

    // Derive last collected_at from overview table
    const allCollectedAts = (overview.data ?? []).map((r) => r.collected_at).filter(Boolean)
    const lastCollectedAt = allCollectedAts.length
      ? allCollectedAts.sort().at(-1)
      : null

    return NextResponse.json({
      overview:       overview.data   ?? [],
      ecommerce:      ecommerce.data  ?? [],
      traffic:        traffic.data    ?? [],
      pages:          pages.data      ?? [],
      deviceGeo:      deviceGeo.data  ?? [],
      lastCollectedAt,
    })
  } catch (err) {
    console.error('Analytics route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
