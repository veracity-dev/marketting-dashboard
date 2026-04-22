import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/semrush/refresh
 * Body: { domain: string, database?: string }
 *
 * Fetches all Semrush data live (organic + backlinks) and writes it to
 * Supabase.  Returns a summary so the client can re-fetch from the DB.
 *
 * Organic data (domain_ranks / domain_organic / domain_organic_organic)
 * is keyed on (domain, database) — different per region.
 *
 * Backlinks data (analytics/v1) is global — no database column.
 */

const ORGANIC_BASE  = 'https://api.semrush.com/'
const BACKLINKS_BASE = 'https://api.semrush.com/analytics/v1/'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key)
}

function cleanDomain(raw: string) {
  return raw.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase().trim()
}

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

function buildOrganic(apiKey: string, params: Record<string, string>) {
  return ORGANIC_BASE + '?' + new URLSearchParams({ key: apiKey, ...params }).toString()
}

function buildBacklinks(apiKey: string, params: Record<string, string>) {
  return BACKLINKS_BASE + '?' + new URLSearchParams({ key: apiKey, ...params }).toString()
}

function isZeroUnits(text: string) {
  return text.includes('132') && text.toUpperCase().includes('UNITS BALANCE IS ZERO')
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body     = await req.json()
    const domain   = cleanDomain(body.domain ?? '')
    const database = body.database ?? 'us'

    if (!domain) {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 })
    }

    const apiKey = process.env.SEMRUSH_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'SEMRUSH_API_KEY not configured' }, { status: 500 })
    }

    const sb          = getSupabase()
    const now         = new Date().toISOString()
    const timeout     = AbortSignal.timeout(30_000)
    const blTarget    = { target: domain, target_type: 'root_domain' }

    // ── Fetch everything in parallel ────────────────────────────────────────
    const [
      ovRes, kwRes, compRes,      // organic
      blOvRes, rdRes, ancRes, tldRes, geoRes, pgRes,  // backlinks
    ] = await Promise.allSettled([
      // Organic overview
      fetch(buildOrganic(apiKey, {
        type: 'domain_ranks',
        export_columns: 'Dn,Rk,Or,Ot,Oc,Ad,At,Ac',
        domain, database,
      }), { signal: timeout }),

      // Organic keywords
      fetch(buildOrganic(apiKey, {
        type: 'domain_organic',
        export_columns: 'Ph,Po,Pp,Pd,Nq,Cp,Ur,Tr',
        domain, database,
        display_limit: '200',
        display_sort: 'tr_desc',
      }), { signal: timeout }),

      // Organic competitors
      fetch(buildOrganic(apiKey, {
        type: 'domain_organic_organic',
        export_columns: 'Dn,Cr,Np,Or,Ot,Oc,Ad',
        domain, database,
        display_limit: '10',
      }), { signal: timeout }),

      // Backlinks overview
      fetch(buildBacklinks(apiKey, {
        type: 'backlinks_overview',
        export_columns: 'ascore,total,domains_num,urls_num,ips_num,follows_num,nofollows_num,texts_num,images_num',
        ...blTarget,
      }), { signal: timeout }),

      // Referring domains
      fetch(buildBacklinks(apiKey, {
        type: 'backlinks_refdomains',
        export_columns: 'domain_ascore,domain,backlinks_num,follows_num,nofollows_num,country,first_seen,last_seen',
        display_limit: '15',
        display_sort: 'backlinks_num_desc',
        ...blTarget,
      }), { signal: timeout }),

      // Anchors
      fetch(buildBacklinks(apiKey, {
        type: 'backlinks_anchors',
        export_columns: 'anchor,domains_num,backlinks_num,follows_num,nofollows_num,first_seen,last_seen',
        display_limit: '15',
        display_sort: 'backlinks_num_desc',
        ...blTarget,
      }), { signal: timeout }),

      // TLD distribution
      fetch(buildBacklinks(apiKey, {
        type: 'backlinks_tld',
        export_columns: 'zone,domains_num,backlinks_num',
        display_limit: '10',
        ...blTarget,
      }), { signal: timeout }),

      // Geographic distribution
      fetch(buildBacklinks(apiKey, {
        type: 'backlinks_geo',
        export_columns: 'country_name,domains_num,backlinks_num',
        display_limit: '10',
        ...blTarget,
      }), { signal: timeout }),

      // Top linking pages
      fetch(buildBacklinks(apiKey, {
        type: 'backlinks_pages',
        export_columns: 'source_url,source_title,page_ascore,backlinks_num,last_seen',
        display_limit: '10',
        display_sort: 'backlinks_num_desc',
        ...blTarget,
      }), { signal: timeout }),
    ])

    // ── Check for zero-units on backlinks (abort BL writes if so) ────────────
    let backlinksBlocked = false
    if (blOvRes.status === 'fulfilled' && blOvRes.value.ok) {
      const peek = await blOvRes.value.clone().text()
      if (isZeroUnits(peek)) backlinksBlocked = true
    }

    // ══ Parse organic ════════════════════════════════════════════════════════

    // Overview row
    let organicOverview: Record<string, unknown> | null = null
    if (ovRes.status === 'fulfilled' && ovRes.value.ok) {
      const rows = parseCsv(await ovRes.value.text())
      if (rows.length) {
        const r = rows[0]
        organicOverview = {
          domain, database,
          semrush_rank:     Number(r['Rank'])                 || 0,
          organic_keywords: Number(r['Organic Keywords'])     || 0,
          organic_traffic:  Number(r['Organic Traffic'])      || 0,
          organic_cost:     Number(r['Organic Cost'])         || 0,
          paid_keywords:    Number(r['Adwords Keywords'])     || 0,
          paid_traffic:     Number(r['Adwords Traffic'])      || 0,
          paid_cost:        Number(r['Adwords Cost'])         || 0,
          collected_at: now,
        }
      }
    }

    // Keywords
    let keywords: Record<string, unknown>[] = []
    if (kwRes.status === 'fulfilled' && kwRes.value.ok) {
      const rows = parseCsv(await kwRes.value.text())
      keywords = rows
        .map((r) => ({
          domain, database,
          keyword:           r['Keyword']           ?? '',
          position:          Number(r['Position'])   || 0,
          previous_position: r['Previous Position'] !== '' ? Number(r['Previous Position']) : null,
          volume:            Number(r['Search Volume']) || 0,
          cpc:               parseFloat(r['CPC']        ?? '0') || 0,
          url:               r['Url']               ?? '',
          traffic_pct:       parseFloat(r['Traffic (%)'] ?? '0') || 0,
          collected_at: now,
        }))
        .filter((k) => k.keyword && (k.position as number) > 0 && (k.position as number) <= 100)
    }

    // Competitors
    let competitors: Record<string, unknown>[] = []
    if (compRes.status === 'fulfilled' && compRes.value.ok) {
      const rows = parseCsv(await compRes.value.text())
      competitors = rows
        .map((r) => ({
          domain, database,
          competitor_domain: r['Domain']                     ?? '',
          relevance:         parseFloat(r['Competitor Relevance'] ?? '0') || 0,
          common_keywords:   Number(r['Common Keywords'])    || 0,
          organic_keywords:  Number(r['Organic Keywords'])   || 0,
          organic_traffic:   Number(r['Organic Traffic'])    || 0,
          organic_cost:      Number(r['Organic Cost'])       || 0,
          paid_keywords:     Number(r['Adwords Keywords'])   || 0,
          collected_at: now,
        }))
        .filter((c) => c.competitor_domain)
    }

    // ══ Parse backlinks ══════════════════════════════════════════════════════

    let blOverview: Record<string, unknown> | null = null
    let refDomains:    Record<string, unknown>[] = []
    let anchors:       Record<string, unknown>[] = []
    let tld:           Record<string, unknown>[] = []
    let geo:           Record<string, unknown>[] = []
    let linkingPages:  Record<string, unknown>[] = []

    if (!backlinksBlocked) {
      if (blOvRes.status === 'fulfilled' && blOvRes.value.ok) {
        const rows = parseCsv(await blOvRes.value.text())
        if (rows.length) {
          const r = rows[0]
          blOverview = {
            domain,
            authority_score: Number(r['ascore'])       || 0,
            total:           Number(r['total'])         || 0,
            domains_num:     Number(r['domains_num'])   || 0,
            urls_num:        Number(r['urls_num'])       || 0,
            ips_num:         Number(r['ips_num'])        || 0,
            follows_num:     Number(r['follows_num'])    || 0,
            nofollows_num:   Number(r['nofollows_num'])  || 0,
            texts_num:       Number(r['texts_num'])      || 0,
            images_num:      Number(r['images_num'])     || 0,
            collected_at: now,
          }
        }
      }

      if (rdRes.status === 'fulfilled' && rdRes.value.ok) {
        const rows = parseCsv(await rdRes.value.text())
        refDomains = rows
          .map((r) => ({
            domain,
            ref_domain:      r['domain']               ?? '',
            authority_score: Number(r['domain_ascore']) || 0,
            backlinks_num:   Number(r['backlinks_num'])  || 0,
            follows_num:     Number(r['follows_num'])    || 0,
            nofollows_num:   Number(r['nofollows_num'])  || 0,
            country:         r['country']              ?? '',
            first_seen:      Number(r['first_seen'])    || null,
            last_seen:       Number(r['last_seen'])     || null,
            collected_at: now,
          }))
          .filter((d) => d.ref_domain)
      }

      if (ancRes.status === 'fulfilled' && ancRes.value.ok) {
        const rows = parseCsv(await ancRes.value.text())
        anchors = rows.map((r) => ({
          domain,
          anchor:        r['anchor']              ?? '',
          domains_num:   Number(r['domains_num'])   || 0,
          backlinks_num: Number(r['backlinks_num'])  || 0,
          follows_num:   Number(r['follows_num'])    || 0,
          nofollows_num: Number(r['nofollows_num'])  || 0,
          first_seen:    Number(r['first_seen'])    || null,
          last_seen:     Number(r['last_seen'])     || null,
          collected_at: now,
        }))
      }

      if (tldRes.status === 'fulfilled' && tldRes.value.ok) {
        const rows = parseCsv(await tldRes.value.text())
        tld = rows
          .map((r) => ({
            domain,
            zone:          r['zone']              ?? '',
            domains_num:   Number(r['domains_num']) || 0,
            backlinks_num: Number(r['backlinks_num']) || 0,
            collected_at: now,
          }))
          .filter((t) => t.zone)
      }

      if (geoRes.status === 'fulfilled' && geoRes.value.ok) {
        const rows = parseCsv(await geoRes.value.text())
        geo = rows
          .map((r) => ({
            domain,
            country_name:  r['country_name']       ?? '',
            domains_num:   Number(r['domains_num'])  || 0,
            backlinks_num: Number(r['backlinks_num']) || 0,
            collected_at: now,
          }))
          .filter((g) => g.country_name)
      }

      if (pgRes.status === 'fulfilled' && pgRes.value.ok) {
        const rows = parseCsv(await pgRes.value.text())
        linkingPages = rows
          .map((r) => ({
            domain,
            source_url:    r['source_url']          ?? '',
            source_title:  r['source_title']         ?? '',
            page_ascore:   Number(r['page_ascore'])   || 0,
            backlinks_num: Number(r['backlinks_num'])  || 0,
            last_seen:     Number(r['last_seen'])     || null,
            collected_at: now,
          }))
          .filter((p) => p.source_url)
      }
    }

    // ══ Write to Supabase ════════════════════════════════════════════════════
    // Wrap every Supabase builder in Promise.resolve() so TypeScript
    // sees a proper Promise<unknown> rather than PromiseLike / FilterBuilder.

    async function upsertOne(table: string, row: Record<string, unknown>, conflict: string) {
      return sb.from(table).upsert(row, { onConflict: conflict })
    }

    async function replaceAll(table: string, rows: Record<string, unknown>[], filter: Record<string, string>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let del: any = sb.from(table).delete()
      for (const [col, val] of Object.entries(filter)) {
        del = del.eq(col, val)
      }
      await del
      if (rows.length > 0) await sb.from(table).insert(rows)
    }

    const writes: Promise<unknown>[] = []

    if (organicOverview) {
      writes.push(upsertOne('semrush_domain_overview', organicOverview, 'domain,database'))
    }
    if (keywords.length > 0) {
      writes.push(replaceAll('semrush_keywords', keywords, { domain, database }))
    }
    if (competitors.length > 0) {
      writes.push(replaceAll('semrush_competitors', competitors, { domain, database }))
    }
    if (blOverview) {
      writes.push(upsertOne('semrush_backlinks_overview', blOverview, 'domain'))
    }
    if (refDomains.length > 0) {
      writes.push(replaceAll('semrush_ref_domains', refDomains, { domain }))
    }
    if (anchors.length > 0) {
      writes.push(replaceAll('semrush_anchors', anchors, { domain }))
    }
    if (tld.length > 0) {
      writes.push(replaceAll('semrush_tld', tld, { domain }))
    }
    if (geo.length > 0) {
      writes.push(replaceAll('semrush_geo', geo, { domain }))
    }
    if (linkingPages.length > 0) {
      writes.push(replaceAll('semrush_linking_pages', linkingPages, { domain }))
    }

    const results = await Promise.allSettled(writes)
    const dbErrors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => r.reason)

    if (dbErrors.length) {
      console.error('[semrush/refresh] DB write errors:', dbErrors)
    }

    return NextResponse.json({
      status:           'ok',
      domain,
      database,
      refreshed_at:     now,
      backlinks_skipped: backlinksBlocked,
      rows: {
        keywords:      keywords.length,
        competitors:   competitors.length,
        ref_domains:   refDomains.length,
        anchors:       anchors.length,
        tld:           tld.length,
        geo:           geo.length,
        linking_pages: linkingPages.length,
      },
    })
  } catch (err) {
    console.error('[semrush/refresh] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
