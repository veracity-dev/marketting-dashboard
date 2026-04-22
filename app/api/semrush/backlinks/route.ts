import { NextRequest, NextResponse } from 'next/server'
import type { SemrushBacklinksData } from '@/lib/types'

/**
 * Semrush Backlinks API — base URL: https://api.semrush.com/analytics/v1/
 *
 * Responses are semicolon-delimited CSV (same format as old analytics API).
 *
 * Known error codes:
 *   ERROR 50  :: limit reached / invalid request
 *   ERROR 120 :: domain is not valid
 *   ERROR 132 :: API units balance is zero
 *   ERROR 133 :: access forbidden (no Backlinks API subscription)
 */
const BACKLINKS_BASE = 'https://api.semrush.com/analytics/v1/'

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  if (lines[0].startsWith('ERROR')) return []
  if (lines[1]?.toUpperCase().startsWith('NOTHING FOUND')) return []
  const headers = lines[0].split(';')
  return lines.slice(1).map((line) => {
    const values = line.split(';')
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] ?? '').trim()]))
  })
}

/** Returns the structured error type from a raw Semrush response text, or null if no error. */
function parseError(text: string): { error: string; error_message: string } | null {
  if (!text.startsWith('ERROR')) return null
  const msg = text.trim()
  if (msg.includes('132') || msg.toUpperCase().includes('UNITS BALANCE IS ZERO')) {
    return { error: 'zero_units', error_message: msg }
  }
  if (msg.includes('133') || msg.toUpperCase().includes('ACCESS FORBIDDEN')) {
    return { error: 'no_access', error_message: msg }
  }
  if (msg.includes('120') || msg.toUpperCase().includes('DOMAIN IS NOT VALID')) {
    return { error: 'invalid_domain', error_message: msg }
  }
  if (msg.includes('50')) {
    return { error: 'api_error', error_message: msg }
  }
  return { error: 'api_error', error_message: msg }
}

function cleanDomain(raw: string): string {
  return raw.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase().trim()
}

function buildUrl(apiKey: string, params: Record<string, string>): string {
  return BACKLINKS_BASE + '?' + new URLSearchParams({ key: apiKey, ...params }).toString()
}

const EMPTY: SemrushBacklinksData = {
  overview: null, ref_domains: [], anchors: [], tld: [], geo: [], pages: [],
  fetchedAt: new Date().toISOString(),
}

export async function GET(req: NextRequest) {
  const sp     = req.nextUrl.searchParams
  const domain = cleanDomain(sp.get('domain') ?? '')

  if (!domain) {
    return NextResponse.json({ error: 'domain query param is required' }, { status: 400 })
  }

  const apiKey = process.env.SEMRUSH_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'SEMRUSH_API_KEY not configured' }, { status: 500 })
  }

  const timeout = AbortSignal.timeout(25_000)
  const target  = { target: domain, target_type: 'root_domain' }

  const [ovRes, rdRes, ancRes, tldRes, geoRes, pgRes] = await Promise.allSettled([
    // 1. Overview — authority score, totals, follow/nofollow counts, link types
    fetch(buildUrl(apiKey, {
      type:           'backlinks_overview',
      export_columns: 'ascore,total,domains_num,urls_num,ips_num,follows_num,nofollows_num,texts_num,images_num',
      ...target,
    }), { signal: timeout }),

    // 2. Referring domains — top 15 by backlink count
    fetch(buildUrl(apiKey, {
      type:           'backlinks_refdomains',
      export_columns: 'domain_ascore,domain,backlinks_num,follows_num,nofollows_num,country,first_seen,last_seen',
      display_limit:  '15',
      display_sort:   'backlinks_num_desc',
      ...target,
    }), { signal: timeout }),

    // 3. Anchor texts — top 15 with follow/nofollow and date range
    fetch(buildUrl(apiKey, {
      type:           'backlinks_anchors',
      export_columns: 'anchor,domains_num,backlinks_num,follows_num,nofollows_num,first_seen,last_seen',
      display_limit:  '15',
      display_sort:   'backlinks_num_desc',
      ...target,
    }), { signal: timeout }),

    // 4. TLD distribution — top 10
    fetch(buildUrl(apiKey, {
      type:           'backlinks_tld',
      export_columns: 'zone,domains_num,backlinks_num',
      display_limit:  '10',
      ...target,
    }), { signal: timeout }),

    // 5. Geographic distribution — top 10 countries
    fetch(buildUrl(apiKey, {
      type:           'backlinks_geo',
      export_columns: 'country_name,domains_num,backlinks_num',
      display_limit:  '10',
      ...target,
    }), { signal: timeout }),

    // 6. Top external pages that link to this domain
    fetch(buildUrl(apiKey, {
      type:           'backlinks_pages',
      export_columns: 'source_url,source_title,page_ascore,backlinks_num,last_seen',
      display_limit:  '10',
      display_sort:   'backlinks_num_desc',
      ...target,
    }), { signal: timeout }),
  ])

  // ── Check first successful response for a hard error ─────────────────────────
  for (const result of [ovRes, rdRes, ancRes, tldRes, geoRes, pgRes]) {
    if (result.status === 'fulfilled' && result.value.ok) {
      const text = await result.value.clone().text()
      const err  = parseError(text.trim())
      if (err) {
        return NextResponse.json({ ...EMPTY, ...err } satisfies SemrushBacklinksData)
      }
      break
    }
  }

  // ── Overview ──────────────────────────────────────────────────────────────────
  let overview: SemrushBacklinksData['overview'] = null
  if (ovRes.status === 'fulfilled' && ovRes.value.ok) {
    const rows = parseCsv(await ovRes.value.text())
    if (rows.length) {
      const r = rows[0]
      overview = {
        authority_score: Number(r['ascore'])        || 0,
        total:           Number(r['total'])          || 0,
        domains_num:     Number(r['domains_num'])    || 0,
        urls_num:        Number(r['urls_num'])        || 0,
        ips_num:         Number(r['ips_num'])         || 0,
        follows_num:     Number(r['follows_num'])     || 0,
        nofollows_num:   Number(r['nofollows_num'])   || 0,
        texts_num:       Number(r['texts_num'])       || 0,
        images_num:      Number(r['images_num'])      || 0,
      }
    }
  }

  // ── Referring domains ─────────────────────────────────────────────────────────
  let ref_domains: SemrushBacklinksData['ref_domains'] = []
  if (rdRes.status === 'fulfilled' && rdRes.value.ok) {
    const rows = parseCsv(await rdRes.value.text())
    ref_domains = rows
      .map((r) => ({
        domain:          r['domain']              ?? '',
        authority_score: Number(r['domain_ascore']) || 0,
        backlinks_num:   Number(r['backlinks_num'])  || 0,
        follows_num:     Number(r['follows_num'])    || 0,
        nofollows_num:   Number(r['nofollows_num'])  || 0,
        country:         r['country']             ?? '',
        first_seen:      r['first_seen']          ?? '',
        last_seen:       r['last_seen']           ?? '',
      }))
      .filter((d) => d.domain)
  }

  // ── Anchor texts ──────────────────────────────────────────────────────────────
  let anchors: SemrushBacklinksData['anchors'] = []
  if (ancRes.status === 'fulfilled' && ancRes.value.ok) {
    const rows = parseCsv(await ancRes.value.text())
    anchors = rows
      .map((r) => ({
        anchor:        r['anchor']              ?? '',
        domains_num:   Number(r['domains_num'])   || 0,
        backlinks_num: Number(r['backlinks_num'])  || 0,
        follows_num:   Number(r['follows_num'])    || 0,
        nofollows_num: Number(r['nofollows_num'])  || 0,
        first_seen:    r['first_seen']           ?? '',
        last_seen:     r['last_seen']            ?? '',
      }))
  }

  // ── TLD distribution ──────────────────────────────────────────────────────────
  let tld: SemrushBacklinksData['tld'] = []
  if (tldRes.status === 'fulfilled' && tldRes.value.ok) {
    const rows = parseCsv(await tldRes.value.text())
    tld = rows
      .map((r) => ({
        zone:          r['zone']              ?? '',
        domains_num:   Number(r['domains_num']) || 0,
        backlinks_num: Number(r['backlinks_num']) || 0,
      }))
      .filter((t) => t.zone)
  }

  // ── Geographic distribution ───────────────────────────────────────────────────
  let geo: SemrushBacklinksData['geo'] = []
  if (geoRes.status === 'fulfilled' && geoRes.value.ok) {
    const rows = parseCsv(await geoRes.value.text())
    geo = rows
      .map((r) => ({
        country_name:  r['country_name']       ?? '',
        domains_num:   Number(r['domains_num'])  || 0,
        backlinks_num: Number(r['backlinks_num']) || 0,
      }))
      .filter((g) => g.country_name)
  }

  // ── Top external pages linking to this domain ─────────────────────────────────
  let pages: SemrushBacklinksData['pages'] = []
  if (pgRes.status === 'fulfilled' && pgRes.value.ok) {
    const rows = parseCsv(await pgRes.value.text())
    pages = rows
      .map((r) => ({
        source_url:    r['source_url']          ?? '',
        source_title:  r['source_title']         ?? '',
        page_ascore:   Number(r['page_ascore'])   || 0,
        backlinks_num: Number(r['backlinks_num'])  || 0,
        last_seen:     r['last_seen']           ?? '',
      }))
      .filter((p) => p.source_url)
  }

  return NextResponse.json({
    overview,
    ref_domains,
    anchors,
    tld,
    geo,
    pages,
    fetchedAt: new Date().toISOString(),
  } satisfies SemrushBacklinksData)
}
