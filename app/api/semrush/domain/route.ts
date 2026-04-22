import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { SemrushDomainData } from '@/lib/types'

/**
 * GET /api/semrush/domain?domain=example.com&database=us
 *
 * Reads Semrush organic data from Supabase.
 * Populate the DB first by calling POST /api/semrush/refresh.
 */

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key)
}

function cleanDomain(raw: string) {
  return raw.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase().trim()
}

export async function GET(req: NextRequest) {
  const sp       = req.nextUrl.searchParams
  const domain   = cleanDomain(sp.get('domain') ?? '')
  const database = sp.get('database') ?? 'us'

  if (!domain) {
    return NextResponse.json({ error: 'domain query param is required' }, { status: 400 })
  }

  try {
    const sb = getSupabase()

    const [ovRes, kwRes, compRes] = await Promise.all([
      sb.from('semrush_domain_overview')
        .select('*')
        .eq('domain', domain)
        .eq('database', database)
        .maybeSingle(),

      sb.from('semrush_keywords')
        .select('*')
        .eq('domain', domain)
        .eq('database', database)
        .order('position', { ascending: true })
        .limit(200),

      sb.from('semrush_competitors')
        .select('*')
        .eq('domain', domain)
        .eq('database', database)
        .order('organic_traffic', { ascending: false })
        .limit(10),
    ])

    const ov   = ovRes.data
    const kws  = kwRes.data  ?? []
    const comp = compRes.data ?? []

    const overview: SemrushDomainData['overview'] = ov
      ? {
          domain:           ov.domain,
          database:         ov.database,
          semrush_rank:     ov.semrush_rank     ?? 0,
          organic_keywords: ov.organic_keywords ?? 0,
          organic_traffic:  ov.organic_traffic  ?? 0,
          organic_cost:     ov.organic_cost      ?? 0,
          paid_keywords:    ov.paid_keywords    ?? 0,
          paid_traffic:     ov.paid_traffic     ?? 0,
          paid_cost:        ov.paid_cost         ?? 0,
        }
      : null

    const keywords: SemrushDomainData['keywords'] = kws.map((k) => ({
      keyword:           k.keyword,
      position:          k.position,
      previous_position: k.previous_position ?? null,
      volume:            k.volume      ?? 0,
      cpc:               Number(k.cpc) ?? 0,
      url:               k.url         ?? '',
      traffic_pct:       Number(k.traffic_pct) ?? 0,
    }))

    const competitors: SemrushDomainData['competitors'] = comp.map((c) => ({
      domain:           c.competitor_domain,
      relevance:        Number(c.relevance)        ?? 0,
      common_keywords:  c.common_keywords          ?? 0,
      organic_keywords: c.organic_keywords         ?? 0,
      organic_traffic:  c.organic_traffic          ?? 0,
      organic_cost:     Number(c.organic_cost)     ?? 0,
      paid_keywords:    c.paid_keywords            ?? 0,
    }))

    const fetchedAt = ov?.collected_at ?? null

    return NextResponse.json({
      overview,
      keywords,
      competitors,
      fetchedAt,
    } satisfies SemrushDomainData)
  } catch (err) {
    console.error('[semrush/domain] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
