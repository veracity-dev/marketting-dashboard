import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { SemrushBacklinksData } from '@/lib/types'

/**
 * GET /api/semrush/backlinks?domain=example.com
 *
 * Reads Semrush backlinks data from Supabase.
 * Populate the DB first by calling POST /api/semrush/refresh.
 *
 * Backlinks data is global (no database column).
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
  const sp     = req.nextUrl.searchParams
  const domain = cleanDomain(sp.get('domain') ?? '')

  if (!domain) {
    return NextResponse.json({ error: 'domain query param is required' }, { status: 400 })
  }

  try {
    const sb = getSupabase()

    const [ovRes, rdRes, ancRes, tldRes, geoRes, pgRes] = await Promise.all([
      sb.from('semrush_backlinks_overview')
        .select('*')
        .eq('domain', domain)
        .maybeSingle(),

      sb.from('semrush_ref_domains')
        .select('*')
        .eq('domain', domain)
        .order('backlinks_num', { ascending: false })
        .limit(15),

      sb.from('semrush_anchors')
        .select('*')
        .eq('domain', domain)
        .order('backlinks_num', { ascending: false })
        .limit(15),

      sb.from('semrush_tld')
        .select('*')
        .eq('domain', domain)
        .order('domains_num', { ascending: false })
        .limit(10),

      sb.from('semrush_geo')
        .select('*')
        .eq('domain', domain)
        .order('domains_num', { ascending: false })
        .limit(10),

      sb.from('semrush_linking_pages')
        .select('*')
        .eq('domain', domain)
        .order('backlinks_num', { ascending: false })
        .limit(10),
    ])

    const ov = ovRes.data

    const overview: SemrushBacklinksData['overview'] = ov
      ? {
          authority_score: ov.authority_score ?? 0,
          total:           ov.total           ?? 0,
          domains_num:     ov.domains_num     ?? 0,
          urls_num:        ov.urls_num        ?? 0,
          ips_num:         ov.ips_num         ?? 0,
          follows_num:     ov.follows_num     ?? 0,
          nofollows_num:   ov.nofollows_num   ?? 0,
          texts_num:       ov.texts_num       ?? 0,
          images_num:      ov.images_num      ?? 0,
        }
      : null

    const ref_domains: SemrushBacklinksData['ref_domains'] = (rdRes.data ?? []).map((r) => ({
      domain:          r.ref_domain,
      authority_score: r.authority_score ?? 0,
      backlinks_num:   r.backlinks_num   ?? 0,
      follows_num:     r.follows_num     ?? 0,
      nofollows_num:   r.nofollows_num   ?? 0,
      country:         r.country         ?? '',
      first_seen:      r.first_seen != null ? String(r.first_seen) : '',
      last_seen:       r.last_seen  != null ? String(r.last_seen)  : '',
    }))

    const anchors: SemrushBacklinksData['anchors'] = (ancRes.data ?? []).map((a) => ({
      anchor:        a.anchor        ?? '',
      domains_num:   a.domains_num   ?? 0,
      backlinks_num: a.backlinks_num ?? 0,
      follows_num:   a.follows_num   ?? 0,
      nofollows_num: a.nofollows_num ?? 0,
      first_seen:    a.first_seen != null ? String(a.first_seen) : '',
      last_seen:     a.last_seen  != null ? String(a.last_seen)  : '',
    }))

    const tld: SemrushBacklinksData['tld'] = (tldRes.data ?? []).map((t) => ({
      zone:          t.zone          ?? '',
      domains_num:   t.domains_num   ?? 0,
      backlinks_num: t.backlinks_num ?? 0,
    }))

    const geo: SemrushBacklinksData['geo'] = (geoRes.data ?? []).map((g) => ({
      country_name:  g.country_name  ?? '',
      domains_num:   g.domains_num   ?? 0,
      backlinks_num: g.backlinks_num ?? 0,
    }))

    const pages: SemrushBacklinksData['pages'] = (pgRes.data ?? []).map((p) => ({
      source_url:    p.source_url    ?? '',
      source_title:  p.source_title  ?? '',
      page_ascore:   p.page_ascore   ?? 0,
      backlinks_num: p.backlinks_num ?? 0,
      last_seen:     p.last_seen != null ? String(p.last_seen) : '',
    }))

    const fetchedAt = ov?.collected_at ?? new Date().toISOString()

    return NextResponse.json({
      overview,
      ref_domains,
      anchors,
      tld,
      geo,
      pages,
      fetchedAt,
    } satisfies SemrushBacklinksData)
  } catch (err) {
    console.error('[semrush/backlinks] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
