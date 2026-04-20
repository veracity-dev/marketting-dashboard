import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const start    = sp.get('start_date')
  const end      = sp.get('end_date')
  const siteUrl  = sp.get('site_url') ?? ''

  if (!start || !end || !siteUrl) {
    return NextResponse.json(
      { error: 'start_date, end_date and site_url query params are required' },
      { status: 400 }
    )
  }

  try {
    const sb = getSupabase()

    const [overview, queries, pages, countries, devices] = await Promise.all([
      sb.from('gsc_daily_overview')
        .select('*').eq('site_url', siteUrl)
        .gte('report_date', start).lte('report_date', end)
        .order('report_date', { ascending: true }),

      sb.from('gsc_queries')
        .select('*').eq('site_url', siteUrl)
        .gte('report_date', start).lte('report_date', end)
        .order('clicks', { ascending: false })
        .limit(500),

      sb.from('gsc_pages')
        .select('*').eq('site_url', siteUrl)
        .gte('report_date', start).lte('report_date', end)
        .order('clicks', { ascending: false })
        .limit(500),

      sb.from('gsc_countries')
        .select('*').eq('site_url', siteUrl)
        .gte('report_date', start).lte('report_date', end)
        .order('clicks', { ascending: false }),

      sb.from('gsc_devices')
        .select('*').eq('site_url', siteUrl)
        .gte('report_date', start).lte('report_date', end)
        .order('clicks', { ascending: false }),
    ])

    const errors = [overview, queries, pages, countries, devices].map((r) => r.error).filter(Boolean)
    if (errors.length) {
      console.error('[gsc/analytics] Supabase errors:', errors)
      return NextResponse.json({ error: 'Database query failed', details: errors }, { status: 500 })
    }

    const lastCollectedAts = (overview.data ?? []).map((r) => r.collected_at).filter(Boolean)
    const lastCollectedAt = lastCollectedAts.length ? lastCollectedAts.sort().at(-1) : null

    return NextResponse.json({
      overview:  overview.data  ?? [],
      queries:   queries.data   ?? [],
      pages:     pages.data     ?? [],
      countries: countries.data ?? [],
      devices:   devices.data   ?? [],
      lastCollectedAt,
    })
  } catch (err) {
    console.error('[gsc/analytics] route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
